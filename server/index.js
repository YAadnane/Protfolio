import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './database.js';
import dotenv from 'dotenv';
import os from 'os';
import { exec } from 'child_process';
import crypto from 'crypto';
import { Client } from '@notionhq/client';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ADMIN_EMAIL || 'adani.yanis@gmail.com', // Fallback or Env
        pass: process.env.EMAIL_PASS // App Password
    }
});
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        // Sanitize filename: remove special chars, spaces to underscores
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, Date.now() + '-' + sanitized);
    }
});

const upload = multer({ storage: storage });

app.use(cors());
// app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir)); // Serve uploaded files statically

// =========================================
// SECURITY: INPUT SANITIZATION
// =========================================
import sanitizeHtml from 'sanitize-html';

const sanitizeValue = (value, key = null) => {
    if (key === 'password') return value; // Skip password sanitization
    if (typeof value === 'string') {
        return sanitizeHtml(value, {
            allowedTags: [], // Strip all HTML tags
            allowedAttributes: {}
        });
    }
    if (typeof value === 'object' && value !== null) {
        for (const k in value) {
            value[k] = sanitizeValue(value[k], k);
        }
    }
    return value;
};

const sanitizeMiddleware = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    next();
};

// Apply globally for JSON bodies (parsed by bodyParser)
app.use(sanitizeMiddleware);

// =========================================
// SECURITY: AUTHENTICATION
// =========================================
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SECRET_KEY = process.env.SECRET_KEY || 'default_dev_secret';
const ADMIN_USER = {
    // FORCE DEFAULT for User Access (admin / admin)
    email: 'admin', 
    passwordHash: '$2b$10$AvzbJGVzQRk7zEP1YZiM2effU.2865ZE3vfBKsVx1miNLvDrhu.qgG'
    // email: process.env.ADMIN_EMAIL || 'admin@example.com',
    // passwordHash: process.env.ADMIN_PASSWORD_HASH || '...'
};



// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Subscribe Endpoint
app.post('/api/subscribe', async (req, res) => {
    const { name, email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required." });
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email format." });
    }

    // Use INSERT OR IGNORE, relying on the UNIQUE index we will add
    db.run("INSERT OR IGNORE INTO subscribers (name, email) VALUES (?, ?)", [name, email], function(err) {
        if (err) {
            console.error("Database error during subscription:", err.message);
            return res.status(500).json({ error: "Failed to subscribe due to a server error." });
        }
        if (this.changes > 0) {
            // Send email notification to admin about new subscription
            const mailOptions = {
                from: process.env.ADMIN_EMAIL,
                to: process.env.ADMIN_EMAIL,
                subject: '🎉 New Newsletter Subscription',
                html: `
                    <h3>New Subscriber!</h3>
                    <p><strong>Name:</strong> ${name || 'Not provided'}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                `
            };
            
            transporter.sendMail(mailOptions, (error) => {
                if (error) console.error('Failed to send subscription notification:', error);
            });
            
            res.status(201).json({ message: "Successfully subscribed!" });
        } else {
            // changes == 0 means it was ignored, so it's a duplicate
            res.status(200).json({ message: "You are already subscribed." });
        }
    });
});

// Unsubscribe Endpoint
app.delete('/api/subscribe', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required." });

    db.run("DELETE FROM subscribers WHERE email = ?", [email], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error." });
        }
        if (this.changes > 0) {
            // Send email notification to admin about unsubscription
            const mailOptions = {
                from: process.env.ADMIN_EMAIL,
                to: process.env.ADMIN_EMAIL,
                subject: '👋 Newsletter Unsubscription',
                html: `
                    <h3>Someone Unsubscribed</h3>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                `
            };
            
            transporter.sendMail(mailOptions, (error) => {
                if (error) console.error('Failed to send unsubscription notification:', error);
            });
            
            res.json({ message: "Unsubscribed successfully." });
        } else {
            res.status(404).json({ error: "Email not found." });
        }
    });
});

// Login Endpoint

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', email); 

    db.get("SELECT * FROM users WHERE username = ?", [email], (err, user) => {
        if (err) return res.status(500).json({ error: "Database error" });
        
        if (!user) {
            // Fallback for hardcoded if DB fails or during migration (Optional, but safer to stick to DB now)
            if (email === ADMIN_USER.email) {
                 bcrypt.compare(password, ADMIN_USER.passwordHash, (err, result) => {
                    if (result) {
                        const token = jwt.sign({ email: email, id: 'static' }, SECRET_KEY, { expiresIn: '24h' });
                        return res.json({ token });
                    }
                    return res.status(401).json({ error: "Invalid credentials" });
                 });
                 return;
            }
            return res.status(401).json({ error: "Invalid credentials" });
        }

        bcrypt.compare(password, user.password_hash, (err, result) => {
            if (result) {
                console.log('Password match!'); 
                const token = jwt.sign({ email: user.username, id: user.id }, SECRET_KEY, { expiresIn: '24h' });
                res.json({ token: token });
            } else {
                console.log('Password mismatch'); 
                res.status(401).json({ error: "Invalid credentials" });
            }
        });
    });
});

// Forgot Password Endpoint
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    
    if (!email) return res.status(400).json({ error: "Username/Email is required." });

    db.get("SELECT * FROM users WHERE username = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ error: "Database error" });
        
        if (!user) {
            // Security: Don't reveal if user exists, but here we can be a bit more explicit if asked
            // Logic: User asked to "verify if valid".
            return res.status(404).json({ error: "User not found." });
        }

        // Generate new password
        const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const hash = await bcrypt.hash(newPassword, 10);

        db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, user.id], (err) => {
            if (err) return res.status(500).json({ error: "Update failed" });

            // Send Email
            const mailOptions = {
                from: process.env.ADMIN_EMAIL || 'admin@example.com',
                to: email, // Assuming username IS the email, which is critical here

                subject: 'Password Reset - Portfolio Admin',
                text: `Hello,\n\nA password reset was requested for your account.\n\nYour NEW Password is: ${newPassword}\n\nPlease login and change it immediately from your profile.\n\nRegards,\nPortfolio System`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending reset email:', error);
                    return res.status(500).json({ error: "Password reset internally but email failed. Contact admin." });
                } else {
                    console.log('Reset email sent: ' + info.response);
                    res.json({ message: "New password sent to your email." });
                }
            });
        });
    });
});

// --- PROFILE MANAGEMENT ---
app.get('/api/profile', authenticateToken, (req, res) => {
    // If using static admin
    if (req.user.id === 'static') {
        return res.json({ id: 'static', username: 'admin' });
    }

    db.get("SELECT id, username FROM users WHERE id = ?", [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "User not found" });
        res.json(row);
    });
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    const { username, password } = req.body;
    const userId = req.user.id;

    if (userId === 'static') {
        return res.status(403).json({ error: "Cannot update static admin. Please migrate to DB user." });
    }

    if (!username) return res.status(400).json({ error: "Username is required" });

    try {
        let updateQuery = "UPDATE users SET username = ?";
        let params = [username];

        if (password && password.trim() !== "") {
            const hash = await bcrypt.hash(password, 10);
            updateQuery += ", password_hash = ?";
            params.push(hash);
        }

        updateQuery += " WHERE id = ?";
        params.push(userId);

        db.run(updateQuery, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Profile updated successfully" });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =========================================
// API ENDPOINTS
// =========================================



// --- CONTACT FORM ---
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const mailOptions = {
            from: process.env.ADMIN_EMAIL || 'adani.yanis@gmail.com', // Sender address
            to: process.env.ADMIN_EMAIL || 'adani.yanis@gmail.com', // Receiver address (yourself)
            subject: `New Contact Form Submission from ${name}`,
            text: `
                Name: ${name}
                Email: ${email}
                Message: ${message}
            `,
            html: `
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        // 1. Store in Database
        await new Promise((resolve, reject) => {
             db.run(`INSERT INTO messages (name, email, message) VALUES (?, ?, ?)`, [name, email, message], function(err) {
                 if (err) reject(err);
                 else resolve();
             });
        });

        // 2. Send Email
        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ success: "Message sent successfully!" });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message. Please try again later." });
    }
});

// --- PROJECTS ---
app.get('/api/projects', (req, res) => {
    const lang = req.query.lang || 'en';
    const query = `
        SELECT p.*, 
        (SELECT COUNT(*) FROM analytics_events e WHERE e.target_id = p.id AND e.event_type = 'click_project') as clicks,
        (SELECT COUNT(*) FROM likes l WHERE l.target_id = p.id AND l.target_type = 'project') as likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.target_id = p.id AND c.target_type = 'project' AND c.is_approved = 1) as comments_count
        FROM projects p 
        WHERE p.lang = ?
    `;
    db.all(query, [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/projects', authenticateToken, upload.single('imageFile'), (req, res) => {
    console.log('POST /api/projects hit');
    const { title, description, tags, category, image, link, is_hidden, lang, role, year, subject, tasks, notion_url } = req.body;
    let imagePath = image;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    db.run(`INSERT INTO projects (title, description, tags, category, image, link, is_hidden, lang, role, year, subject, tasks, notion_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, tags, category, imagePath, link, is_hidden || 0, lang || 'en', role, year, subject, tasks, notion_url],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/projects/:id', authenticateToken, upload.single('imageFile'), (req, res) => {
    console.log(`PUT /api/projects/${req.params.id} hit`);
    const { title, description, tags, category, image, link, is_hidden, role, year, subject, tasks, notion_url } = req.body;
    
    let imagePath = image;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    db.run(`UPDATE projects SET title = ?, description = ?, tags = ?, image = ?, link = ?, category = ?, is_hidden = ?, role = ?, year = ?, subject = ?, tasks = ?, notion_url = ? WHERE id = ?`,
        [title, description, tags, imagePath, link, category, is_hidden, role, year, subject, tasks, notion_url, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.serialize(() => {
        // Cascade Delete
        db.run("DELETE FROM likes WHERE target_type = 'project' AND target_id = ?", id);
        db.run("DELETE FROM comments WHERE target_type = 'project' AND target_id = ?", id);
        db.run("DELETE FROM analytics_events WHERE (event_type = 'click_project' OR event_type = 'view_project') AND target_id = ?", id);
        
        db.run("DELETE FROM projects WHERE id = ?", id, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted successfully" });
        });
    });
}); 

// Get Notion Content for Project
app.get('/api/projects/:id/notion-content', async (req, res) => {
    const projectId = req.params.id;
    
    try {
        // Get project from database
        const project = await new Promise((resolve, reject) => {
            db.get('SELECT notion_url FROM projects WHERE id = ?', [projectId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!project || !project.notion_url) {
            return res.status(404).json({ error: 'No Notion URL linked to this project' });
        }

        // Get Notion API key from database (same as articles)
        const config = await new Promise((resolve, reject) => {
            db.get("SELECT notion_api_key FROM general_info LIMIT 1", [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!config || !config.notion_api_key) {
            return res.status(500).json({ error: "Notion API key not configured in database" });
        }

        // Extract ID from URL
        let pageId = null;
        // Improved Regex to handle query params and various formats (32 hex chars)
        // It matches 32 hex chars that are followed by ?, #, /, or end of string
        const match = project.notion_url.match(/([a-f0-9]{32})(\?|$|#|\/)/);
        if (match) {
            pageId = match[1];
        } else {
            // Try UUID with dashes
            const matchUuid = project.notion_url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            if(matchUuid) pageId = matchUuid[1].replace(/-/g, '');
        }

        console.log(`[Notion] Fetching content for project ${projectId}. URL: ${project.notion_url} -> Extracted ID: ${pageId}`);

        if (!pageId) {
            console.error(`[Notion] Failed to extract ID from URL: ${project.notion_url}`);
            return res.status(400).json({ error: "Invalid Notion URL format" });
        }
        
        // Initialize Notion client with DB API key
        const notion = new Client({ auth: config.notion_api_key });
        
        try {
            // Fetch page blocks from Notion
            const blocks = await notion.blocks.children.list({
                block_id: pageId,
                page_size: 100
            });
            
            // Convert blocks to HTML (simple conversion)
            let html = '';
            for (const block of blocks.results) {
                if (block.type === 'paragraph') {
                    const text = block.paragraph.rich_text.map(t => t.plain_text).join('');
                    html += `<p>${text}</p>`;
                } else if (block.type === 'heading_1') {
                    const text = block.heading_1.rich_text.map(t => t.plain_text).join('');
                    html += `<h1>${text}</h1>`;
                } else if (block.type === 'heading_2') {
                    const text = block.heading_2.rich_text.map(t => t.plain_text).join('');
                    html += `<h2>${text}</h2>`;
                } else if (block.type === 'heading_3') {
                    const text = block.heading_3.rich_text.map(t => t.plain_text).join('');
                    html += `<h3>${text}</h3>`;
                } else if (block.type === 'bulleted_list_item') {
                    const text = block.bulleted_list_item.rich_text.map(t => t.plain_text).join('');
                    html += `<ul><li>${text}</li></ul>`;
                } else if (block.type === 'numbered_list_item') {
                    const text = block.numbered_list_item.rich_text.map(t => t.plain_text).join('');
                    html += `<ol><li>${text}</li></ol>`;
                } else if (block.type === 'code') {
                    const text = block.code.rich_text.map(t => t.plain_text).join('');
                   html += `<pre><code>${text}</code></pre>`;
                } else if (block.type === 'image') {
                    const url = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
                    html += `<img src="${url}" style="max-width:100%;" />`;
                }
            }
            
            res.json({ content: html });
        } catch (notionError) {
            console.error('[Notion] API Error Details:', {
                message: notionError.message,
                code: notionError.code,
                status: notionError.status,
                body: notionError.body
            });
            res.status(500).json({ error: 'Failed to fetch Notion content', details: notionError.message });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ---CERTIFICATIONS ---
app.get('/api/certifications', (req, res) => {
    const lang = req.query.lang || 'en';
    const query = `
        SELECT c.*, 
        (SELECT COUNT(*) FROM analytics_events e WHERE e.target_id = c.id AND e.event_type = 'click_certif') as clicks
        FROM certifications c 
        WHERE c.lang = ?
    `;
    db.all(query, [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/certifications', upload.fields([{ name: 'pdfFile', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }]), authenticateToken, (req, res) => {
    const { name, issuer, icon, year, domain, pdf, is_hidden, lang, status, description, skills, credential_id, credential_url, level, image } = req.body;
    
    const pdfPath = req.files['pdfFile'] ? `/uploads/${req.files['pdfFile'][0].filename}` : pdf;
    const imagePath = req.files['imageFile'] ? `/uploads/${req.files['imageFile'][0].filename}` : image;

    db.run(`INSERT INTO certifications (
        name, issuer, icon, year, domain, pdf, is_hidden, lang, status, 
        description, skills, credential_id, credential_url, level, image
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name, issuer, icon, year, domain, pdfPath, is_hidden || 0, lang || 'en', status || 'obtained',
            description, skills, credential_id, credential_url, level, imagePath
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/certifications/:id', upload.fields([{ name: 'pdfFile', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }]), authenticateToken, (req, res) => {
    const { name, issuer, icon, year, domain, pdf, is_hidden, status, description, skills, credential_id, credential_url, level, image } = req.body;
    
    let pdfPath = pdf;
    if (req.files['pdfFile']) {
        pdfPath = `/uploads/${req.files['pdfFile'][0].filename}`;
    }

    let imagePath = image;
    if (req.files['imageFile']) {
        imagePath = `/uploads/${req.files['imageFile'][0].filename}`;
    }

    db.run(`UPDATE certifications SET 
        name = ?, issuer = ?, icon = ?, year = ?, domain = ?, pdf = ?, is_hidden = ?, status = ?,
        description = ?, skills = ?, credential_id = ?, credential_url = ?, level = ?, image = ?
        WHERE id = ?`,
        [
            name, issuer, icon, year, domain, pdfPath, is_hidden, status,
            description, skills, credential_id, credential_url, level, imagePath,
            req.params.id
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

app.delete('/api/certifications/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM certifications WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

// --- EDUCATION ---
app.get('/api/education', (req, res) => {
    const lang = req.query.lang || 'en';
    db.all("SELECT * FROM education WHERE lang = ? ORDER BY id DESC", [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/education', authenticateToken, upload.fields([{ name: 'logoFile', maxCount: 1 }, { name: 'brochureFile', maxCount: 1 }]), (req, res) => {
    const { degree, institution, start_date, end_date, description, is_hidden, lang, logo, brochure } = req.body;
    let logoPath = logo || '';
    if (req.files && req.files['logoFile']) {
        logoPath = `/uploads/${req.files['logoFile'][0].filename}`;
    }
    let brochurePath = brochure || '';
    if (req.files && req.files['brochureFile']) {
        brochurePath = `/uploads/${req.files['brochureFile'][0].filename}`;
    }

    db.run(`INSERT INTO education (degree, institution, start_date, end_date, description, is_hidden, lang, logo, brochure) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [degree, institution, start_date, end_date, description, is_hidden || 0, lang || 'en', logoPath, brochurePath],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/education/:id', authenticateToken, upload.fields([{ name: 'logoFile', maxCount: 1 }, { name: 'brochureFile', maxCount: 1 }]), (req, res) => {
    const { degree, institution, start_date, end_date, description, is_hidden, logo, brochure } = req.body;
    let logoPath = logo;
    if (req.files && req.files['logoFile']) {
        logoPath = `/uploads/${req.files['logoFile'][0].filename}`;
    }
    let brochurePath = brochure;
    if (req.files && req.files['brochureFile']) {
        brochurePath = `/uploads/${req.files['brochureFile'][0].filename}`;
    }

    db.run(`UPDATE education SET degree = ?, institution = ?, start_date = ?, end_date = ?, description = ?, is_hidden = ?, logo = ?, brochure = ? WHERE id = ?`,
        [degree, institution, start_date, end_date, description, is_hidden, logoPath, brochurePath, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

app.delete('/api/education/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM education WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

// --- EXPERIENCE ---
app.get('/api/experience', (req, res) => {
    const lang = req.query.lang || 'en';
    db.all("SELECT * FROM experience WHERE lang = ? ORDER BY id DESC", [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/experience', authenticateToken, upload.fields([{ name: 'logoFile', maxCount: 1 }]), (req, res) => {
    const { role, company, start_date, end_date, description, is_hidden, lang, logo, website, linkedin } = req.body;
    let logoPath = logo || '';
    if (req.files && req.files['logoFile']) {
        logoPath = `/uploads/${req.files['logoFile'][0].filename}`;
    }

    db.run(`INSERT INTO experience (role, company, start_date, end_date, description, is_hidden, lang, logo, website, linkedin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [role, company, start_date, end_date, description, is_hidden || 0, lang || 'en', logoPath, website, linkedin],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/experience/:id', authenticateToken, upload.fields([{ name: 'logoFile', maxCount: 1 }]), (req, res) => {
    const { role, company, start_date, end_date, description, is_hidden, logo, website, linkedin } = req.body;
    let logoPath = logo;
    if (req.files && req.files['logoFile']) {
        logoPath = `/uploads/${req.files['logoFile'][0].filename}`;
    }

    db.run(`UPDATE experience SET role = ?, company = ?, start_date = ?, end_date = ?, description = ?, is_hidden = ?, logo = ?, website = ?, linkedin = ? WHERE id = ?`,
        [role, company, start_date, end_date, description, is_hidden, logoPath, website, linkedin, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

app.delete('/api/experience/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM experience WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

// --- SKILLS ---
app.get('/api/skills', (req, res) => {
    const lang = req.query.lang || 'en';
    db.all("SELECT * FROM skills WHERE lang = ?", [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/skills', authenticateToken, (req, res) => {
    const { category, name, level, icon, is_hidden, lang } = req.body;
    db.run(`INSERT INTO skills (category, name, level, icon, is_hidden, lang) VALUES (?, ?, ?, ?, ?, ?)`,
        [category, name, level, icon, is_hidden || 0, lang || 'en'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/skills/:id', authenticateToken, (req, res) => {
    const { category, name, level, icon, is_hidden } = req.body;
    db.run(`UPDATE skills SET category = ?, name = ?, level = ?, icon = ?, is_hidden = ? WHERE id = ?`,
        [category, name, level, icon, is_hidden, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

// --- GENERAL INFO ---
// --- GENERAL INFO ---
// Public GET: Exclude Sensitive API Key
app.get('/api/general', (req, res) => {
    const lang = req.query.lang || 'en';
    db.get("SELECT * FROM general_info WHERE lang = ? ORDER BY id DESC LIMIT 1", [lang], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            row.has_api_key = !!row.gemini_api_key && row.gemini_api_key.length > 0;
            delete row.gemini_api_key; // SECURITY: Do not expose key to public
        }
        res.json(row || {});
    });
});

// Admin PUT: Update General Info
app.put('/api/general', upload.fields([{ name: 'cvFile', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), sanitizeMiddleware, authenticateToken, (req, res) => {
    const { 
        hero_subtitle, hero_title, hero_description, hero_description_2, hero_description_3,
        about_lead, about_bio, 
        stat_years, stat_projects, stat_companies,
        cube_front, cube_back, cube_right, cube_left, cube_top, cube_bottom,
        email, phone, location, linkedin_link, github_link,
        cv_file, profile_image, lang, gemini_api_key, gemini_model, notion_api_key // Added notion_api_key
    } = req.body;
    
    // console.log('PUT /api/general payload:', req.body); // Debug log

    const targetLang = lang || 'en';

    let cvPath = cv_file;
    if (req.files && req.files['cvFile']) {
        cvPath = `/uploads/${req.files['cvFile'][0].filename}`;
    }

    let imagePath = profile_image;
    if (req.files && req.files['profileImage']) {
        imagePath = `/uploads/${req.files['profileImage'][0].filename}`;
    }

    db.run(`UPDATE general_info SET 
        hero_subtitle = ?, hero_title = ?, hero_description = ?, hero_description_2 = ?, hero_description_3 = ?,
        about_lead = ?, about_bio = ?, 
        stat_years = ?, stat_projects = ?, stat_companies = ?,
        cube_front = ?, cube_back = ?, cube_right = ?, cube_left = ?, cube_top = ?, cube_bottom = ?,
        cv_file = ?, profile_image = ?, email = ?, phone = ?, location = ?, linkedin_link = ?, github_link = ?,
        gemini_api_key = COALESCE(NULLIF(?, ''), gemini_api_key),
        gemini_model = ?,
        notion_api_key = COALESCE(NULLIF(?, ''), notion_api_key)
        WHERE lang = ?`,
        [
            hero_subtitle, hero_title, hero_description, hero_description_2, hero_description_3,
            about_lead, about_bio, 
            stat_years, stat_projects, stat_companies,
            cube_front, cube_back, cube_right, cube_left, cube_top, cube_bottom,
            cvPath, imagePath, email, phone, location, linkedin_link, github_link,
            gemini_api_key,
            gemini_model || 'gemini-1.5-flash', // Default if missing
            notion_api_key,
            targetLang
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log('Update result:', this.changes); 
            res.json({ message: "Updated successfully", changes: this.changes });
        }
    );
});


// --- ARTICLES ---
app.get('/api/articles', (req, res) => {
    const lang = req.query.lang || 'en';
    const query = `
        SELECT a.*, 
        (SELECT COUNT(*) FROM analytics_events e WHERE e.target_id = a.id AND e.event_type = 'view_article') as clicks,
        (SELECT COUNT(*) FROM likes l WHERE l.target_id = a.id AND l.target_type = 'article') as likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.target_id = a.id AND c.target_type = 'article' AND c.is_approved = 1) as comments_count
        FROM articles a 
        WHERE a.lang = ? 
        ORDER BY date DESC
    `;
    db.all(query, [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log('DEBUG ARTICLES FETCH:', JSON.stringify(rows, null, 2)); // Debugging Link Issue
        res.json(rows);
    });
});

app.post('/api/articles', authenticateToken, upload.single('imageFile'), (req, res) => {
    const { title, summary, link, date, updated_date, tags, is_hidden, lang, image } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : (image || null);

    db.run(`INSERT INTO articles (title, summary, link, date, updated_date, tags, image, is_hidden, lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, summary, link, date, updated_date, tags, imagePath, is_hidden || 0, lang || 'en'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/articles/:id', authenticateToken, upload.single('imageFile'), (req, res) => {
    const { title, summary, link, date, updated_date, tags, is_hidden, image } = req.body;
    let imagePath = image || null;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    db.run(`UPDATE articles SET title = ?, summary = ?, link = ?, date = ?, updated_date = ?, tags = ?, image = ?, is_hidden = ? WHERE id = ?`,
        [title, summary, link, date, updated_date, tags, imagePath, is_hidden, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

app.delete('/api/articles/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.serialize(() => {
        // Cascade Delete
        db.run("DELETE FROM likes WHERE target_type = 'article' AND target_id = ?", id);
        db.run("DELETE FROM comments WHERE target_type = 'article' AND target_id = ?", id);
        db.run("DELETE FROM analytics_events WHERE event_type = 'view_article' AND target_id = ?", id);
        
        db.run("DELETE FROM articles WHERE id = ?", id, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted successfully" });
        });
    });
});

// Get Article Content from Notion
app.get('/api/articles/:id/content', async (req, res) => {
    const articleId = req.params.id;
    const lang = req.query.lang || 'en';
    
    try {
        // 1. Get article metadata from database
        const article = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM articles WHERE id = ?", [articleId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!article) {
            return res.status(404).json({ error: "Article not found" });
        }
        
        // 2. Get Notion API key from database
        const config = await new Promise((resolve, reject) => {
            db.get("SELECT notion_api_key FROM general_info WHERE lang = ? OR lang = 'en' LIMIT 1", [lang], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!config || !config.notion_api_key) {
            return res.status(500).json({ error: "Notion API key not configured" });
        }
        
        // 3. Extract Notion page ID from link
        const notionLink = article.link;
        if (!notionLink || !notionLink.includes('notion.')) {
            return res.status(400).json({ error: "Invalid Notion link" });
        }
        
        // Extract page ID from various Notion URL formats
        let pageId = notionLink.split('?')[0].split('/').pop().split('-').pop();
        pageId = pageId.replace(/-/g, '');
        
        if (!pageId || pageId.length < 32) {
            return res.status(400).json({ error: "Could not extract Notion page ID" });
        }
        
        //  4. Fetch content from Notion
        const notion = new Client({ auth: config.notion_api_key });
        
        const blocks = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 100
        });
        
        // 5. Convert blocks to HTML
        const html = blocksToHtml(blocks.results);
        
        res.json({
            id: article.id,
            title: article.title,
            date: article.date,
            image: article.image,
            tags: article.tags,
            summary: article.summary,
            content: html
        });
        
    } catch (err) {
        console.error("Notion fetch error:", err);
        res.status(500).json({ error: err.message || "Failed to fetch article content" });
    }
});

// Helper function to convert Notion blocks to HTML
function blocksToHtml(blocks) {
    let html = '';
    
    blocks.forEach(block => {
        switch (block.type) {
            case 'paragraph':
                const pText = block.paragraph.rich_text.map(t => richTextToHtml(t)).join('');
                html += `<p>${pText}</p>`;
                break;
            case 'heading_1':
                const h1Text = block.heading_1.rich_text.map(t => richTextToHtml(t)).join('');
                html += `<h1>${h1Text}</h1>`;
                break;
            case 'heading_2':
                const h2Text = block.heading_2.rich_text.map(t => richTextToHtml(t)).join('');
                html += `<h2>${h2Text}</h2>`;
                break;
            case 'heading_3':
                const h3Text = block.heading_3.rich_text.map(t => richTextToHtml(t)).join('');
                html += `<h3>${h3Text}</h3>`;
                break;
            case 'bulleted_list_item':
                const liText = block.bulleted_list_item.rich_text.map(t => richTextToHtml(t)).join('');
                html += `<li>${liText}</li>`;
                break;
            case 'numbered_list_item':
                const numText = block.numbered_list_item.rich_text.map(t => richTextToHtml(t)).join('');
                html += `<li>${numText}</li>`;
                break;
            case 'code':
                const codeText = block.code.rich_text.map(t => t.plain_text).join('');
                html += `<pre><code>${codeText}</code></pre>`;
                break;
            case 'image':
                const imageUrl = block.image.type === 'external' ? block.image.external.url : block.image.file.url
;
                html += `<img src="${imageUrl}" alt="Image" style="max-width:100%;height:auto;" />`;
                break;
            case 'divider':
                html += '<hr />';
                break;
            default:
                // Skip unsupported block types
                break;
        }
    });
    
    return html;
}

function richTextToHtml(richText) {
    let text = richText.plain_text;
    
    if (richText.annotations.bold) text = `<strong>${text}</strong>`;
    if (richText.annotations.italic) text = `<em>${text}</em>`;
    if (richText.annotations.code) text = `<code>${text}</code>`;
    if (richText.annotations.strikethrough) text = `<s>${text}</s>`;
    if (richText.annotations.underline) text = `<u>${text}</u>`;
    
    if (richText.href) text = `<a href="${richText.href}" target="_blank">${text}</a>`;
    
    return text;
}

// --- INTERACTIONS (LIKES & COMMENTS) ---
app.get('/api/comments', (req, res) => {
    const { type, id } = req.query;
    if (!type || !id) return res.status(400).json({ error: "Missing type or id" });

    db.all(`SELECT id, name, message, social_platform, social_link, date FROM comments 
            WHERE target_type = ? AND target_id = ? AND is_approved = 1 
            ORDER BY date DESC`, 
            [type, id], 
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows);
            });
});

app.delete('/api/comments/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM comments WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

app.post('/api/interact/like', (req, res) => {
    const { type, id, client_id } = req.body;
    
    if (!client_id) return res.status(400).json({ error: "Missing client_id" });

    db.run(`INSERT OR IGNORE INTO likes (target_type, target_id, client_id) VALUES (?, ?, ?)`,
        [type, id, client_id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // If changes == 0, it means it was ignored (already liked)
            if (this.changes === 0) {
                 // Toggle off (unlike)
                 db.run(`DELETE FROM likes WHERE target_type = ? AND target_id = ? AND client_id = ?`, [type, id, client_id], (err) => {
                     if (err) return res.status(500).json({ error: err.message });
                     db.get(`SELECT COUNT(*) as count FROM likes WHERE target_type = ? AND target_id = ?`, [type, id], (err, row) => {
                        res.json({ message: "Unliked", count: row.count, liked: false });
                     });
                 });
            } else {
                db.get(`SELECT COUNT(*) as count FROM likes WHERE target_type = ? AND target_id = ?`, [type, id], (err, row) => {
                    res.json({ message: "Liked", count: row.count, liked: true });
                });
            }
        }
    );
});

app.post('/api/interact/comment', (req, res) => {
    // Sanitization is handled globally by sanitizeMiddleware
    const { type, id, name, message, social_platform, social_link } = req.body;
    
    if (!message || message.trim() === "") {
        return res.status(400).json({ error: "Message is required" });
    }

    db.run(`INSERT INTO comments (target_type, target_id, name, message, social_platform, social_link, is_approved) VALUES (?, ?, ?, ?, ?, ?, 1)`, // Auto-approve for demo
        [type, id, name || 'Anonymous', message, social_platform || '', social_link || ''],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Comment submitted", id: this.lastID });
        }
    );
});

// --- ANALYTICS TRACKING ---
app.post('/api/track', (req, res) => {
    const { type, id, metadata } = req.body;
    db.run(`INSERT INTO analytics_events (event_type, target_id, metadata) VALUES (?, ?, ?)`,
        [type, id, metadata ? JSON.stringify(metadata) : null],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Return updated count
            db.get(`SELECT COUNT(*) as count FROM analytics_events WHERE event_type = ? AND target_id = ?`, 
                [type, id], 
                (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: "Event tracked", count: row.count });
                }
            );
        }
    );
});

app.post('/api/track/visit', (req, res) => {
    // Get IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
    // Hash IP for privacy
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    const ua = req.headers['user-agent'] || '';
    
    // Parse Device
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(ua);
    const device = isMobile ? 'mobile' : 'desktop';

    // Get Lang from body (default to en)
    const lang = req.body.lang || 'en';

    // Log to visits table for Unique Visitor tracking
    db.run(`INSERT INTO visits (ip_hash, user_agent, lang, device) VALUES (?, ?, ?, ?)`, [ipHash, ua, lang, device], (err) => {
        if (err) console.error("Visit log error:", err.message);
    });

    // Also Log generic event for consistency if needed, but 'visits' table is primary for traffic now.
    // We can keep the event log if we want 'site_visit' in the events stream, or just rely on visits table.
    // Let's keep strict backwards compat for any other query using analytics_events
    db.run(`INSERT INTO analytics_events (event_type, target_id) VALUES (?, ?)`,
        ['site_visit', 0],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Visit tracked" });
        }
    );
});


// --- DYNAMIC STATS ---
// --- SUBSCRIPTION API ---
app.post('/api/subscribe', (req, res) => {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // UPSERT Logic: Insert or Update if exists
    // SQLite doesn't have standard UPSERT until newer versions, but we can try INSERT OR IGNORE then UPDATE
    // Or just check first.
    db.get("SELECT id FROM subscribers WHERE email = ?", [email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row) {
            // Exists -> Reactivate
            db.run("UPDATE subscribers SET is_active = 1, name = COALESCE(?, name) WHERE id = ?", [name, row.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Subscribed successfully (Welcome back!)" });
            });
        } else {
            // New -> Insert
            db.run("INSERT INTO subscribers (name, email, is_active) VALUES (?, ?, 1)", [name, email], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Subscribed successfully" });
            });
        }
    });
});

app.post('/api/unsubscribe', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    db.run("UPDATE subscribers SET is_active = 0 WHERE email = ?", [email], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Email not found" });
        res.json({ message: "Unsubscribed successfully" });
    });
});


app.get('/api/stats', (req, res) => {
    const lang = req.query.lang || 'en';
    const stats = {};

    // Use Promises for parallel DB queries
    const queries = [
        new Promise((resolve) => {
            db.all("SELECT start_date, end_date, year FROM experience WHERE is_hidden = 0", [], (err, rows) => {
                let totalMonths = 0;
                
                if (rows && rows.length > 0) {
                    rows.forEach(r => {
                        let start, end;
                        
                        // Parse Start
                        if (r.start_date) {
                            start = new Date(r.start_date);
                             // Handle "Sep 2020" or just "2020"
                            if (isNaN(start.getTime())) {
                                const m = r.start_date.toString().match(/(\d{4})/);
                                if (m) start = new Date(parseInt(m[0]), 0, 1);
                            }
                        } else if (r.year) {
                            // Fallback to year (assume Jan 1st)
                             const m = r.year.toString().match(/(\d{4})/);
                             if (m) start = new Date(parseInt(m[0]), 0, 1);
                        }

                        // Parse End
                        if (!r.end_date || r.end_date.toLowerCase() === 'present' || r.end_date.trim() === '') {
                            end = new Date();
                        } else {
                            end = new Date(r.end_date);
                            if (isNaN(end.getTime())) {
                                const m = r.end_date.toString().match(/(\d{4})/);
                                if (m) end = new Date(parseInt(m[0]), 11, 31);
                            }
                        }

                        // Add Duration
                        if (start && !isNaN(start.getTime()) && end && !isNaN(end.getTime())) {
                            let diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                            if (diffMonths < 0) diffMonths = 0; 
                            if (diffMonths === 0) diffMonths = 1; 
                            
                            totalMonths += diffMonths;
                        }
                    });
                    
                    stats.years = Math.floor(totalMonths / 12);
                } else {
                    stats.years = 0;
                }
                resolve();
            });
        }),
        new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM projects WHERE is_hidden = 0 AND lang = ?", [lang], (err, row) => {
                stats.projects = row ? row.count : 0;
                resolve();
            });
        }),
        new Promise((resolve) => {
            db.get("SELECT COUNT(DISTINCT company) as count FROM experience WHERE is_hidden = 0 AND lang = ?", [lang], (err, row) => {
                stats.companies = row ? row.count : 0;
                resolve();
            });
        }),
        new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM certifications WHERE is_hidden = 0 AND lang = ?", [lang], (err, row) => {
                stats.certs = row ? row.count : 0;
                resolve();
            });
        }),
        new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM articles WHERE is_hidden = 0 AND lang = ?", [lang], (err, row) => {
                stats.articles = row ? row.count : 0;
                resolve();
            });
        }),
        new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM reviews WHERE is_approved = 1", [], (err, row) => {
                stats.reviews = row ? row.count : 0;
                resolve();
            });
        })
    ];

    Promise.all(queries).then(() => {
        res.json(stats);
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});


// --- CHATBOT ---
import { GoogleGenerativeAI } from "@google/generative-ai";

app.post('/api/chat', async (req, res) => {
    const { message, lang } = req.body;
    const targetLang = lang || 'en';

    if (!message) return res.status(400).json({ error: "Message required" });

    // Fix: Fallback to 'en' if specific language config doesn't exist
    db.all("SELECT gemini_api_key, gemini_model, lang FROM general_info WHERE lang = ? OR lang = 'en'", [targetLang], async (err, rows) => {
        if (err) {
            console.error("Chatbot DB Error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        
        console.log("Chatbot Request Lang:", targetLang);
        console.log("Config Rows Found:", rows);

        // Find best match: Exact lang with key > 'en' with key > any match
        const configRow = rows.find(r => r.lang === targetLang && r.gemini_api_key) 
                       || rows.find(r => r.lang === 'en' && r.gemini_api_key)
                       || rows[0];

        console.log("Selected Config Row:", configRow);

        if (!configRow || !configRow.gemini_api_key) return res.status(500).json({ error: "Chatbot not configured (API Key missing)." });

        const apiKey = configRow.gemini_api_key;
        const modelName = configRow.gemini_model || "gemini-1.5-flash"; // Use selected model
        
        // 2. Fetch Portfolio Context
        const contextData = {};
        
        const getAsync = (query, params = []) => new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        try {
            const general = await new Promise((resolve, reject) => {
                 db.get("SELECT * FROM general_info WHERE lang = ?", [targetLang], (err, r) => err ? reject(err) : resolve(r));
            });
            const projects = await getAsync(`
                SELECT p.title, p.description, p.tags, p.category, p.role, p.year, p.subject, p.tasks,
                (SELECT COUNT(*) FROM analytics_events e WHERE e.target_id = p.id AND e.event_type = 'click_project') as visits,
                (SELECT COUNT(*) FROM likes l WHERE l.target_id = p.id AND l.target_type = 'project') as likes,
                (SELECT COUNT(*) FROM comments c WHERE c.target_id = p.id AND c.target_type = 'project' AND c.is_approved = 1) as comments_count,
                (SELECT GROUP_CONCAT(c.name || ' said: ' || c.message, ' | ') FROM comments c WHERE c.target_id = p.id AND c.target_type = 'project' AND c.is_approved = 1) as visitor_comments
                FROM projects p 
                WHERE p.is_hidden = 0 AND p.lang = ?
            `, [targetLang]);
            
            const skills = await getAsync("SELECT name, category, level FROM skills WHERE is_hidden = 0 AND lang = ?", [targetLang]);
            const experience = await getAsync("SELECT role, company, year, description FROM experience WHERE is_hidden = 0 AND lang = ?", [targetLang]);
            const education = await getAsync("SELECT degree, institution, year, description FROM education WHERE is_hidden = 0 AND lang = ?", [targetLang]);
            const certs = await getAsync("SELECT name, issuer, year, domain, status, description, skills, credential_id, credential_url, level FROM certifications WHERE is_hidden = 0 AND lang = ?", [targetLang]);
            
            const articles = await getAsync(`
                SELECT a.title, a.summary, a.tags, a.date,
                (SELECT COUNT(*) FROM analytics_events e WHERE e.target_id = a.id AND e.event_type = 'view_article') as views,
                (SELECT COUNT(*) FROM likes l WHERE l.target_id = a.id AND l.target_type = 'article') as likes,
                (SELECT COUNT(*) FROM comments c WHERE c.target_id = a.id AND c.target_type = 'article' AND c.is_approved = 1) as comments_count,
                (SELECT GROUP_CONCAT(c.name || ' said: ' || c.message, ' | ') FROM comments c WHERE c.target_id = a.id AND c.target_type = 'article' AND c.is_approved = 1) as visitor_comments
                FROM articles a 
                WHERE a.is_hidden = 0 AND a.lang = ?
            `, [targetLang]);
            const reviews = await getAsync("SELECT name, role, message, rating, social_platform FROM reviews WHERE is_approved = 1");

            // Fetch Analytics/Dashboard Stats
            const totalVisitors = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM visits', (err, row) => err ? reject(err) : resolve(row?.count || 0));
            });
            const totalClicks = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM analytics_events', (err, row) => err ? reject(err) : resolve(row?.count || 0));
            });
            const topProjects = await getAsync(`
                SELECT p.title, COUNT(e.id) as clicks 
                FROM projects p 
                LEFT JOIN analytics_events e ON e.event_type='click_project' AND e.target_id=p.id 
                WHERE p.lang = ? 
                GROUP BY p.id 
                ORDER BY clicks DESC 
                LIMIT 5
            `, [targetLang]);
            const topCerts = await getAsync(`
                SELECT c.name, COUNT(e.id) as clicks 
                FROM certifications c 
                LEFT JOIN analytics_events e ON e.event_type='click_certif' AND e.target_id=c.id 
                WHERE c.lang = ? 
                GROUP BY c.id 
                ORDER BY clicks DESC 
                LIMIT 5
            `, [targetLang]);

            // 3. Construct System Prompt
            // Fix: Use explicit name instead of job title (hero_subtitle)
            const portfolioOwner = "Adnane YADANI"; 
            const systemPrompt = `
                You are an AI assistant for ${portfolioOwner}'s portfolio.
                Your goal is to answer visitor questions about ${portfolioOwner}'s skills, projects, and background.
                Be professional, concise, and helpful. Use the following context to answer:

                Bio: ${general.about_bio}
                Skills: ${JSON.stringify(skills)}
                Experience: ${JSON.stringify(experience)}
                Education: ${JSON.stringify(education)}
                Projects: ${JSON.stringify(projects)}
                Certifications: ${JSON.stringify(certs)}
                Articles/Blog: ${JSON.stringify(articles)}
                Reviews/Testimonials: ${JSON.stringify(reviews)}
                Contact: Email: ${general.email}, LinkedIn: ${general.linkedin_link}

                Portfolio Analytics & Statistics:
                - Total Visitors: ${totalVisitors}
                - Total Clicks: ${totalClicks}
                - Top Projects (by popularity): ${JSON.stringify(topProjects)}
                - Top Certifications (by interest): ${JSON.stringify(topCerts)}

                If the question is not related to the portfolio or professional background, politely steer it back.
                Answer in the language of the user question (default ${targetLang}).
            `;

            // 4. Call Gemini
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent([
                systemPrompt,
                `User Question: ${message}`
            ]);
            
            const responseText = result.response.text();
            
            // Save conversation to database
            db.run(
                'INSERT INTO chatbot_conversations (question, answer, lang) VALUES (?, ?, ?)',
                [message, responseText, targetLang],
                (err) => {
                    if (err) console.error('Failed to save chatbot conversation:', err);
                }
            );
            
            res.json({ reply: responseText });

        } catch (error) {
            console.error("Gemini Error:", error);
            // More detailed client error if possible, but keep secure
            res.status(500).json({ error: "Failed to generate response. Check API Key or Model selection." });
        }
    });
});

// GET Chatbot History (Admin Only)
app.get('/api/admin/chatbot-history', authenticateToken, (req, res) => {
    const limit = req.query.limit || 50;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let query = 'SELECT id, question, answer, lang, date FROM chatbot_conversations';
    let whereConditions = [];
    let params = [];
    
    // Add date filters if provided
    if (startDate) {
        whereConditions.push('date >= ?');
        params.push(startDate);
    }
    if (endDate) {
        // Add 1 day to endDate to include the entire end day
        whereConditions.push('date < date(?, "+1 day")');
        params.push(endDate);
    }
    
    if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY date DESC LIMIT ?';
    params.push(limit);
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Chatbot history error:', err);
            return res.status(500).json({ error: 'Failed to fetch chatbot history' });
        }
        res.json(rows || []);
    });
});

app.delete('/api/skills/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM skills WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});



// --- SHAPES ---
app.get('/api/shapes', (req, res) => {
    const lang = req.query.lang || 'en';
    db.all("SELECT * FROM shapes WHERE lang = ?", [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/shapes', authenticateToken, (req, res) => {
    const { type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden, lang, is_mobile_visible } = req.body;
    
    const insertShape = () => {
        db.run(`INSERT INTO shapes (type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden, lang, is_mobile_visible) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [type || 'cube', face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden || 0, lang || 'en', is_mobile_visible || 0],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID });
            }
        );
    };

    if (is_mobile_visible) {
        // Reset others first
        db.run("UPDATE shapes SET is_mobile_visible = 0 WHERE lang = ?", [lang || 'en'], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            insertShape();
        });
    } else {
        insertShape();
    }
});

app.put('/api/shapes/:id', authenticateToken, (req, res) => {
    console.log('PUT /api/shapes payload:', req.body); // Debug log
    const { type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden, is_mobile_visible, lang } = req.body; 
    
    // Improve robustness: Fetch existing shape first to get correct language
    db.get("SELECT * FROM shapes WHERE id = ?", [req.params.id], (err, existingShape) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!existingShape) return res.status(404).json({ error: "Shape not found" });

        // Use provided lang or fallback to existing (never default to 'en' blindly)
        const targetLang = lang || existingShape.lang || 'en';
        
        // Fix boolean/string type issue strictly
        const isMobileBool = (is_mobile_visible === '1' || is_mobile_visible === 1 || is_mobile_visible === true);

        const updateShape = () => {
            db.run(`UPDATE shapes SET type = ?, face_front = ?, face_back = ?, face_right = ?, face_left = ?, face_top = ?, face_bottom = ?, size = ?, pos_x = ?, pos_y = ?, icon = ?, is_hidden = ?, is_mobile_visible = ?, lang = ? WHERE id = ?`,
                [type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden, isMobileBool ? 1 : 0, targetLang, req.params.id],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    console.log('Update successful, changes:', this.changes);
                    res.json({ message: "Updated successfully" });
                }
            );
        };

        if (isMobileBool) {
            console.log('Resetting mobile visible for lang:', targetLang);
            db.run("UPDATE shapes SET is_mobile_visible = 0 WHERE lang = ?", [targetLang], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                updateShape();
            });
        } else {
            updateShape();
        }
    });
});

app.delete('/api/shapes/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM shapes WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});



// Admin: Get Messages
app.get('/api/messages', authenticateToken, (req, res) => {
    db.all("SELECT * FROM messages ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Mark as Read
app.put('/api/messages/:id/read', authenticateToken, (req, res) => {
    db.run("UPDATE messages SET is_read = 1 WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Marked as read" });
    });
});

// Admin: Delete Message
app.delete('/api/messages/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM messages WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

// --- ARTICLES ---
app.get('/api/articles', (req, res) => {
    const lang = req.query.lang || 'en';
    const limit = req.query.limit ? `LIMIT ${parseInt(req.query.limit)}` : '';
    // Select all columns including image
    db.all(`SELECT * FROM articles WHERE is_hidden = 0 AND lang = ? ORDER BY date DESC ${limit}`, [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/articles', authenticateToken, upload.single('imageFile'), (req, res) => {
    const { title, summary, tags, image, link, is_hidden, lang, date } = req.body;
    let imagePath = image;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    db.run(`INSERT INTO articles (title, summary, tags, image, link, is_hidden, lang, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, summary, tags, imagePath, link, is_hidden || 0, lang || 'en', date || new Date().toISOString()],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/articles/:id', authenticateToken, upload.single('imageFile'), (req, res) => {
    const { title, summary, tags, image, link, is_hidden, lang, date } = req.body;
    let imagePath = image;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    db.run(`UPDATE articles SET title = ?, summary = ?, tags = ?, image = ?, link = ?, is_hidden = ?, lang = ?, date = ? WHERE id = ?`,
        [title, summary, tags, imagePath, link, is_hidden, lang, date, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

app.delete('/api/articles/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM articles WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

// --- REVIEWS ---
app.get('/api/reviews', (req, res) => {
    db.all("SELECT * FROM reviews WHERE is_approved = 1 ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/reviews', sanitizeMiddleware, (req, res) => {
    const { name, role, message, rating, social_link, social_platform } = req.body;
    if (!name || !message || !rating) {
        return res.status(400).json({ error: "Name, message and rating are required." });
    }

    db.run(`INSERT INTO reviews (name, role, message, rating, social_link, social_platform, is_approved) VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [name, role, message, rating, social_link || '', social_platform || 'other'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Send Email Notification
            const mailOptions = {
                from: process.env.ADMIN_EMAIL || 'admin@example.com',
                to: process.env.ADMIN_EMAIL || 'admin@example.com',
                subject: `New Review from ${name}`,
                text: `You have received a new review:\n\nName: ${name}\nRole: ${role || 'N/A'}\nPlatform: ${social_platform || 'N/A'}\nLink: ${social_link || 'N/A'}\nRating: ${rating}/5\n\nReview:\n${message}\n\nPlease check your admin dashboard to validate or publish it.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Review email sent: ' + info.response);
                }
            });

            res.json({ message: "Review submitted successfully", id: this.lastID });
        }
    );
});

// Admin: Get All Reviews
app.get('/api/admin/reviews', authenticateToken, (req, res) => {
    db.all("SELECT * FROM reviews ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Approve Review
app.put('/api/reviews/:id/approve', authenticateToken, (req, res) => {
    db.run("UPDATE reviews SET is_approved = 1 WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Review approved" });
    });
});

// Admin: Delete Review
app.delete('/api/reviews/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM reviews WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Review deleted" });
    });
});

// --- MEDIA MANAGER API ---
app.get('/api/media', authenticateToken, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read uploads directory' });
        }

        const fileList = files.map(file => {
            const filePath = path.join(uploadDir, file);
            try {
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                    url: `/uploads/${file}`,
                    mtime: stats.mtime
                };
            } catch (e) {
                return null;
            }
        }).filter(f => f !== null).sort((a, b) => b.mtime - a.mtime); // Sort by newest

        res.json(fileList);
    });
});

app.delete('/api/media/:filename', authenticateToken, (req, res) => {
    const filename = req.params.filename;
    // Simple validation to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(uploadDir, filename);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).json({ error: 'Failed to delete file' });
        }
        res.json({ message: 'File deleted successfully' });
    });
});

// --- DATABASE MANAGER API ---
app.get('/api/admin/database/tables', authenticateToken, (req, res) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => r.name));
    });
});

// Admin History Stats (Filtered)
app.get('/api/admin/stats/history', authenticateToken, (req, res) => {
    const { year, month } = req.query;
    // Group by DATE (YYYY-MM-DD)
    let query = "SELECT DATE(date) as day, COUNT(*) as count FROM visits";
    let params = [];
    let conditions = [];

    if (year) {
        conditions.push("strftime('%Y', date) = ?");
        params.push(year);
    }
    if (month) {
        conditions.push("strftime('%m', date) = ?");
        params.push(month.toString().padStart(2, '0'));
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " GROUP BY DATE(date) ORDER BY date ASC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/admin/database/table/:name', authenticateToken, (req, res) => {
    const tableName = req.params.name;
    // Basic SQL Injection prevention: Whitelist tables
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, tables) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const validTables = tables.map(t => t.name);
        if (!validTables.includes(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        db.all(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 100`, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });
});


app.delete('/api/admin/database/table/:name', authenticateToken, (req, res) => {
    const tableName = req.params.name;
    // Security Whitelist
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, tables) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const validTables = tables.map(t => t.name);
        if (!validTables.includes(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        db.run(`DELETE FROM ${tableName}`, [], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: `Table ${tableName} cleared successfully` });
        });
    });
});

// --- NOTION PROXY ---

app.get('/api/notion/page/:id', async (req, res) => {
    try {
        if (!process.env.NOTION_API_KEY) {
             return res.status(500).send("Server missing NOTION_API_KEY");
        }
        const notion = new Client({ auth: process.env.NOTION_API_KEY });
        const { id } = req.params;
        
        // Fetch blocks
        const response = await notion.blocks.children.list({ block_id: id });
        
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; padding: 20px; max-width: 800px; margin: 0 auto; }
                img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
                h1, h2, h3 { color: #111; margin-top: 2rem; }
                p { margin-bottom: 1rem; }
                li { margin-bottom: 0.5rem; }
                code { background: #f4f4f4; padding: 2px 5px; border-radius: 4px; font-family: monospace; }
                pre { background: #f4f4f4; padding: 15px; border-radius: 8px; overflow-x: auto; }
            </style>
        </head>
        <body>
        `;
        
        // Simple Renderer Strategy
        for (const block of response.results) {
            try {
                if (block.type === 'paragraph') {
                    const text = block.paragraph.rich_text.map(t => t.plain_text).join('');
                    if(text) html += `<p>${text}</p>`;
                } 
                else if (block.type === 'heading_1') {
                    const text = block.heading_1.rich_text.map(t => t.plain_text).join('');
                    html += `<h1>${text}</h1>`;
                } 
                else if (block.type === 'heading_2') {
                     const text = block.heading_2.rich_text.map(t => t.plain_text).join('');
                    html += `<h2>${text}</h2>`;
                } 
                else if (block.type === 'heading_3') {
                     const text = block.heading_3.rich_text.map(t => t.plain_text).join('');
                    html += `<h3>${text}</h3>`;
                } 
                else if (block.type === 'bulleted_list_item') {
                     const text = block.bulleted_list_item.rich_text.map(t => t.plain_text).join('');
                    html += `<ul><li>${text}</li></ul>`; // Should perform improved list grouping but this is MVP
                } 
                else if (block.type === 'numbered_list_item') {
                     const text = block.numbered_list_item.rich_text.map(t => t.plain_text).join('');
                    html += `<ol><li>${text}</li></ol>`;
                }
                else if (block.type === 'image') {
                     const src = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
                     const caption = block.image.caption?.map(t => t.plain_text).join('') || '';
                     html += `<figure><img src="${src}" alt="${caption}"><figcaption>${caption}</figcaption></figure>`;
                 }
                 else if (block.type === 'code') {
                     const text = block.code.rich_text.map(t => t.plain_text).join('');
                     html += `<pre><code>${text}</code></pre>`;
                 }
            } catch (e) { console.error('Render error for block', block.type); }
        }
        
        html += '</body></html>';
        res.send(html);
        
    } catch (error) {
        console.error("Notion Fetch Error:", error);
        res.status(500).send(`<div style="padding:20px; color:red;">Failed to load content from Notion. (${error.message})</div>`);
    }
});

// --- SEO / SITEMAP ---
app.get('/sitemap.xml', (req, res) => {
    const baseUrl = 'https://yadani-adnane.duckdns.org';
    const lastMod = new Date().toISOString().split('T')[0];
    
    // NOTE: The <?xml declaration MUST be the very first characters. No whitespace allowed.
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${lastMod}</lastmod>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/#about</loc>
        <lastmod>${lastMod}</lastmod>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/#skills</loc>
        <lastmod>${lastMod}</lastmod>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/#work</loc>
        <lastmod>${lastMod}</lastmod>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/#education</loc>
        <lastmod>${lastMod}</lastmod>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>${baseUrl}/#contact</loc>
        <lastmod>${lastMod}</lastmod>
        <priority>0.7</priority>
    </url>
</urlset>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
});

// =========================================
// ANALYTICS TRACKING API
// =========================================

// Track Visit
app.post('/api/track/visit', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'] || '';
    // Create a daily hash to count unique daily visitors per IP without storing raw IP
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hash = crypto.createHash('sha256').update(`${ip}-${ua}-${dateStr}`).digest('hex');

    // Check if visit exists for today
    db.get('SELECT id FROM visits WHERE ip_hash = ? AND date >= ?', [hash, dateStr + ' 00:00:00'], (err, row) => {
        if (err) return res.sendStatus(500);
        if (!row) {
            db.run('INSERT INTO visits (ip_hash, user_agent) VALUES (?, ?)', [hash, ua], (err) => {
                if (err) console.error('Track visit error:', err);
            });
        }
        res.sendStatus(200);
    });
});

// Track Event (Click)
app.post('/api/track/event', (req, res) => {
    const { type, id, meta } = req.body;
    db.run('INSERT INTO analytics_events (event_type, target_id, metadata) VALUES (?, ?, ?)', 
        [type, id || 0, meta || ''], 
        (err) => {
            if (err) console.error('Track event error:', err);
            res.sendStatus(200);
        }
    );
});

// --- SUBSCRIBER MANAGEMENT ---
app.get('/api/admin/subscribers', authenticateToken, (req, res) => {
    db.all("SELECT * FROM subscribers ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =========================================
// ADMIN STATS API
// =========================================
app.get('/api/admin/stats', authenticateToken, (req, res) => {
    const { year, month, lang, device } = req.query;
    const stats = {};

    // 1. Build Date Filter
    // Note: 'date' column name needs to match the table context (e.g. 'e.date' or 'date')
    // We will build a parameterized fragment.
    let filterParams = [];
    let filterSql = "";
    
    if (year) {
        filterSql += " AND strftime('%Y', date) = ?";
        filterParams.push(year);
    }
    if (month) {
        filterSql += " AND strftime('%m', date) = ?";
        filterParams.push(month.toString().padStart(2, '0'));
    }
    if (lang) {
        filterSql += " AND lang = ?";
        filterParams.push(lang);
    }
    if (device) {
        filterSql += " AND device = ?";
        filterParams.push(device);
    }

    // Filter for tables aliased as 'e' (analytics_events)
    let eventFilterSql = filterSql.replace(/date/g, 'e.date');
    
    // CONTENT FILTER (Only Lang applies to inventory, usually)
    let contentFilterSql = "";
    let contentFilterParams = [];
    if (lang) {
        contentFilterSql += " WHERE lang = ?";
        contentFilterParams.push(lang);
    }

    // 2. Base Counts
    // 2. Base Counts
    const { sort } = req.query; // 'views', 'likes', 'comments'

    // Separate Filters
    // Metric Filters (Year, Month) -> Apply to the JOIN (Event/Like/Comment)
    // Content Filters (Lang) -> Apply to the Main Table (Project/Article/Cert)
    let metricFilterParams = [];
    let metricFilterSql = "";
    if (year) {
        metricFilterSql += " AND strftime('%Y', metric.date) = ?";
        metricFilterParams.push(year);
    }
    if (month) {
        metricFilterSql += " AND strftime('%m', metric.date) = ?";
        metricFilterParams.push(month.toString().padStart(2, '0'));
    }

    let contentSql = ""; 
    let contentParams = [];
    if (lang) {
        contentSql += " WHERE lang = ?";
        contentParams.push(lang);
    }



// --- ADMIN STATS ---
    const getAllContent = (table, metricTable, metricTypeField, metricTypeValue, labelField) => {
        // Construct Query
        // SELECT T.label, COUNT(M.id) as clicks FROM Table T LEFT JOIN Metric M ON T.id = M.target_id AND M.target_type = ... AND [MetricFilters] [ContentFilters] GROUP BY T.id ORDER BY clicks DESC
        
        // Handle Analytics Events (views) which uses 'event_type' instead of 'target_type'
        let joinCondition = "";
        if (metricTable === 'analytics_events') {
             joinCondition = `T.id = metric.target_id AND metric.event_type = '${metricTypeValue}' ${metricFilterSql.replace(/metric\.date/g, 'metric.date')}`;
        } else {
             // Likes / Comments
             joinCondition = `T.id = metric.target_id AND metric.target_type = '${metricTypeValue}' ${metricFilterSql}`;
        }

        const query = `
            SELECT T.${labelField} as name, COUNT(metric.id) as clicks 
            FROM ${table} T 
            LEFT JOIN ${metricTable} metric ON ${joinCondition}
            ${contentSql}
            GROUP BY T.id 
            ORDER BY clicks DESC
        `;
        
        // Combine params: metric params inside join (if any) + content params (where)
        // Wait, params order matters?
        // SQLite: Params are bound in order. 
        // Metric params are in JOIN ON. Content params are in WHERE.
        // JOIN comes before WHERE. So Metric Params then Content Params.
        const params = [...metricFilterParams, ...contentParams];

        return new Promise(resolve => db.all(query, params, (e, r) => resolve({k: `top_${table}`, v: r || []})));
    };

    let topProjectsProm, topCertifsProm, topArticlesProm;

    if (sort === 'likes') {
         topProjectsProm = getAllContent('projects', 'likes', 'target_type', 'project', 'title');
         // Certs don't have likes, just return all certs with 0
         topCertifsProm = new Promise(resolve => db.all(`SELECT name, 0 as clicks FROM certifications ${contentSql}`, contentParams, (e,r)=>resolve({k:'top_certifications', v:r||[]})));
         topArticlesProm = getAllContent('articles', 'likes', 'target_type', 'article', 'title');
    } else if (sort === 'comments') {
         topProjectsProm = getAllContent('projects', 'comments', 'target_type', 'project', 'title');
         topCertifsProm = new Promise(resolve => db.all(`SELECT name, 0 as clicks FROM certifications ${contentSql}`, contentParams, (e,r)=>resolve({k:'top_certifications', v:r||[]})));
         topArticlesProm = getAllContent('articles', 'comments', 'target_type', 'article', 'title');
    } else {
        // Default: Views (Clicks in analytics_events)
        topProjectsProm = getAllContent('projects', 'analytics_events', 'event_type', 'click_project', 'title');
        topCertifsProm = getAllContent('certifications', 'analytics_events', 'event_type', 'click_certif', 'name');
        topArticlesProm = getAllContent('articles', 'analytics_events', 'event_type', 'view_article', 'title');
    }

    const queries = [
        new Promise(resolve => db.get(`SELECT COUNT(*) as c FROM projects ${contentFilterSql}`, contentFilterParams, (e, r) => resolve({k:'projects', v:r?.c||0}))),
        new Promise(resolve => db.get(`SELECT COUNT(*) as c FROM certifications ${contentFilterSql}`, contentFilterParams, (e, r) => resolve({k:'certifications', v:r?.c||0}))),
        new Promise(resolve => db.get(`SELECT COUNT(*) as c FROM articles ${contentFilterSql}`, contentFilterParams, (e, r) => resolve({k:'articles', v:r?.c||0}))),
        new Promise(resolve => db.get('SELECT COUNT(*) as c FROM messages', (e, r) => resolve({k:'messages_total', v:r?.c||0}))),
        new Promise(resolve => db.get('SELECT COUNT(*) as c FROM messages WHERE is_read=0', (e, r) => resolve({k:'messages_unread', v:r?.c||0}))),
        new Promise(resolve => db.get('SELECT COUNT(*) as c FROM reviews', (e, r) => resolve({k:'reviews_total', v:r?.c||0}))),
        new Promise(resolve => db.get('SELECT COUNT(*) as c FROM reviews WHERE is_approved=0', (e, r) => resolve({k:'reviews_pending', v:r?.c||0}))),
        
        // SUBSCRIBERS
        new Promise(resolve => db.get('SELECT COUNT(*) as c FROM subscribers WHERE is_active=1', (e, r) => resolve({k:'subscribers_active', v:r?.c||0}))),
        new Promise(resolve => db.get('SELECT COUNT(*) as c FROM subscribers WHERE is_active=0', (e, r) => resolve({k:'subscribers_unsubscribed', v:r?.c||0}))),
        
        // NEW: Interaction Totals (Filtered)
        new Promise(resolve => db.get(`SELECT COUNT(*) as c FROM likes WHERE 1=1 ${filterSql}`, filterParams, (e, r) => resolve({k:'total_likes', v:r?.c||0}))),
        new Promise(resolve => db.get(`SELECT COUNT(*) as c FROM comments WHERE 1=1 ${filterSql}`, filterParams, (e, r) => resolve({k:'total_comments', v:r?.c||0}))),
        
        // 4. Analytics Counts (Filtered)
        // Visitors (Unique IPs)
        // Note: Using 'ip_hash' as defined in visits table.
        new Promise(resolve => db.get(`SELECT COUNT(DISTINCT ip_hash) as c FROM visits WHERE 1=1 ${filterSql}`, filterParams, (e, r) => resolve({k:'total_visitors', v:r?.c||0}))),
        new Promise(resolve => db.get(`SELECT COUNT(DISTINCT ip_hash) as c FROM visits WHERE date >= date('now', '-7 days')`, [], (e, r) => resolve({k:'visitors_7d', v:r?.c||0}))),
        
        // Total Clicks (Filtered)
        new Promise(resolve => db.get(`SELECT COUNT(*) as c FROM analytics_events e WHERE 1=1 ${eventFilterSql}`, filterParams, (e, r) => resolve({k:'total_clicks', v:r?.c||0}))),

        // Category Clicks (Filtered) - FOR CHARTS
        new Promise(resolve => db.get(`SELECT COUNT(*) as c FROM analytics_events e WHERE e.event_type = 'click_project' ${eventFilterSql}`, filterParams, (e, r) => resolve({k:'clicks_projects', v:r?.c||0}))),
        new Promise(resolve => db.get(`SELECT COUNT(*) as c FROM analytics_events e WHERE e.event_type = 'click_certif' ${eventFilterSql}`, filterParams, (e, r) => resolve({k:'clicks_certifs', v:r?.c||0}))),
        new Promise(resolve => db.get(`SELECT COUNT(*) as c FROM analytics_events e WHERE e.event_type = 'view_article' ${eventFilterSql}`, filterParams, (e, r) => resolve({k:'clicks_articles', v:r?.c||0}))),

        // Historical Stats
         new Promise(resolve => {
            let histQuery = `SELECT DATE(date) as day, COUNT(*) as count FROM visits WHERE 1=1 ${filterSql} GROUP BY DATE(date) ORDER BY date ASC`;
            let histParams = filterParams;
            if (!year && !month) {
               histQuery = `SELECT DATE(date) as day, COUNT(*) as count FROM visits WHERE date >= date('now', '-30 days') GROUP BY DATE(date) ORDER BY date ASC`;
               histParams = [];
            }
            db.all(histQuery, histParams, (e, r) => resolve({k: 'visits_history', v: r || []}));
        }),

        // TOP ITEMS (Sorted)
        topProjectsProm, topCertifsProm, topArticlesProm
    ];

    Promise.all(queries).then(results => {
        results.forEach(item => stats[item.k] = item.v);
        res.json(stats);
    }).catch(err => {
        console.error('Stats Error Stack:', err.stack);
        res.status(500).json({
            error: err.message, 
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
        });
    });
});

// =========================================
// SYSTEM MONITOR API
// =========================================
app.get('/api/admin/system', authenticateToken, async (req, res) => {
    try {
        // 1. CPU & RAM
        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const cores = cpus.length;
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercentage = Math.round((usedMem / totalMem) * 100);
        const uptime = os.uptime();

        // CPU Load (Simple average of recent load / cores for Linux, or fallback)
        const loadAvg = os.loadavg();
        const cpuLoad = Math.min(100, Math.round((loadAvg[0] / cores) * 100)); // Rough estimate %

        // 2. Storage (Disk Space) - Async
        const getDiskUsage = () => new Promise((resolve) => {
            if (process.platform === 'win32') {
                // Windows Fallback (mock or use wmic if strict)
                resolve({ total: 0, used: 0, percent: 0, free: 0 }); 
            } else {
                // Linux: df -h /
                exec('df -B1 /', (err, stdout) => {
                    if (err) { resolve(null); return; }
                    // Filesystem     1B-blocks      Used Available Use% Mounted on
                    const lines = stdout.trim().split('\n');
                    if (lines.length < 2) { resolve(null); return; }
                    const parts = lines[1].replace(/\s+/g, ' ').split(' ');
                    // parts[1]=Total, parts[2]=Used, parts[3]=Avail, parts[4]=Use%
                    resolve({
                        total: parseInt(parts[1]),
                        used: parseInt(parts[2]),
                        free: parseInt(parts[3]),
                        percent: parseInt(parts[4].replace('%',''))
                    });
                });
            }
        });

        // 3. Network Stats - Async
        const getNetworkStats = () => new Promise((resolve) => {
            if (process.platform === 'win32') {
                 resolve({ rx: 0, tx: 0 });
            } else {
                 fs.readFile('/proc/net/dev', 'utf8', (err, data) => {
                     if (err) { resolve(null); return; }
                     const lines = data.split('\n');
                     let rx = 0;
                     let tx = 0;
                     // Sum up all non-loopback interfaces
                     lines.forEach(line => {
                         if (line.includes(':') && !line.includes('lo:')) {
                             const parts = line.split(':')[1].trim().replace(/\s+/g, ' ').split(' ');
                             rx += parseInt(parts[0]); // bytes received
                             tx += parseInt(parts[8]); // bytes transmitted
                         }
                     });
                     resolve({ rx, tx });
                 });
            }
        });

        const [disk, net] = await Promise.all([getDiskUsage(), getNetworkStats()]);

        res.json({
            cpu: {
                model: cpuModel,
                cores: cores,
                load: cpuLoad
            },
            memory: {
                total: totalMem,
                used: usedMem,
                free: freeMem,
                percent: memPercentage
            },
            uptime: uptime,
            disk: disk || { error: 'Unavailable' },
            network: net || { error: 'Unavailable' }
        });

    } catch (err) {
        console.error('System Stats Error:', err);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

// =========================================
// SERVE FRONTEND (MUST BE LAST)
// =========================================
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath, {
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
