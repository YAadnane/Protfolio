import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2b$10$HREwPsOL57zGfNOb7tfdMuHB4HkrTA.lYC2AFc9VePxJQPnXmvT5a'
};

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // No token

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = user;
        next();
    });
};

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', email); // Debug log

    if (email === ADMIN_USER.email) {
        bcrypt.compare(password, ADMIN_USER.passwordHash, (err, result) => {
            if (result) {
                console.log('Password match!'); // Debug log
                // Password matches
                const token = jwt.sign({ email: email }, SECRET_KEY, { expiresIn: '24h' });
                res.json({ token: token });
            } else {
                console.log('Password mismatch'); // Debug log
                res.status(401).json({ error: "Invalid credentials" });
            }
        });
    } else {
        console.log('Email mismatch'); // Debug log
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// =========================================
// API ENDPOINTS
// =========================================

// --- PROJECTS ---
app.get('/api/projects', (req, res) => {
    const lang = req.query.lang || 'en';
    db.all("SELECT * FROM projects WHERE lang = ?", [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});    
app.put('/api/projects/:id', authenticateToken, upload.single('imageFile'), (req, res) => {
    const { title, description, tags, category, image, link, is_hidden } = req.body;
    // If a new file is uploaded, use it. Otherwise, keep the old one (passed as 'image' body param or handled via logic)
    // Note: In a real app, we might want to delete the old file.
    let imagePath = image;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    db.run(`UPDATE projects SET title = ?, description = ?, tags = ?, image = ?, link = ?, category = ?, is_hidden = ? WHERE id = ?`,
        [title, description, tags, imagePath, link, category, is_hidden, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM projects WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

// --- CERTIFICATIONS ---
app.get('/api/certifications', (req, res) => {
    const lang = req.query.lang || 'en';
    db.all("SELECT * FROM certifications WHERE lang = ?", [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/certifications', upload.single('pdfFile'), authenticateToken, (req, res) => {
    const { name, issuer, icon, year, domain, pdf, is_hidden, lang } = req.body;
    const pdfPath = req.file ? `/uploads/${req.file.filename}` : pdf;

    db.run(`INSERT INTO certifications (name, issuer, icon, year, domain, pdf, is_hidden, lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, issuer, icon, year, domain, pdfPath, is_hidden || 0, lang || 'en'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/certifications/:id', upload.single('pdfFile'), authenticateToken, (req, res) => {
    const { name, issuer, icon, year, domain, pdf, is_hidden } = req.body;
    
    let pdfPath = pdf;
    if (req.file) {
        pdfPath = `/uploads/${req.file.filename}`;
    }

    db.run(`UPDATE certifications SET name = ?, issuer = ?, icon = ?, year = ?, domain = ?, pdf = ?, is_hidden = ? WHERE id = ?`,
        [name, issuer, icon, year, domain, pdfPath, is_hidden, req.params.id],
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
    db.all("SELECT * FROM education WHERE lang = ?", [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/education', authenticateToken, (req, res) => {
    const { degree, institution, year, description, is_hidden, lang } = req.body;
    db.run(`INSERT INTO education (degree, institution, year, description, is_hidden, lang) VALUES (?, ?, ?, ?, ?, ?)`,
        [degree, institution, year, description, is_hidden || 0, lang || 'en'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/education/:id', authenticateToken, (req, res) => {
    const { degree, institution, year, description, is_hidden } = req.body;
    db.run(`UPDATE education SET degree = ?, institution = ?, year = ?, description = ?, is_hidden = ? WHERE id = ?`,
        [degree, institution, year, description, is_hidden, req.params.id],
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
    db.all("SELECT * FROM experience WHERE lang = ?", [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/experience', authenticateToken, (req, res) => {
    const { role, company, year, description, is_hidden, lang } = req.body;
    db.run(`INSERT INTO experience (role, company, year, description, is_hidden, lang) VALUES (?, ?, ?, ?, ?, ?)`,
        [role, company, year, description, is_hidden || 0, lang || 'en'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/experience/:id', authenticateToken, (req, res) => {
    const { role, company, year, description, is_hidden } = req.body;
    db.run(`UPDATE experience SET role = ?, company = ?, year = ?, description = ?, is_hidden = ? WHERE id = ?`,
        [role, company, year, description, is_hidden, req.params.id],
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
            delete row.gemini_api_key; // SECURITY: Do not expose key to public
        }
        res.json(row || {});
    });
});

// Admin PUT: Update General Info
app.put('/api/general', upload.fields([{ name: 'cvFile', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), sanitizeMiddleware, authenticateToken, (req, res) => {
    const { 
        hero_subtitle, hero_title, hero_description, 
        about_lead, about_bio, 
        stat_years, stat_projects, stat_companies,
        cube_front, cube_back, cube_right, cube_left, cube_top, cube_bottom,
        email, phone, location, linkedin_link, github_link,
        cv_file, profile_image, lang, gemini_api_key, gemini_model // Added gemini_model
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

    // Dynamic SQL construction to only update key if provided
    db.run(`UPDATE general_info SET 
        hero_subtitle = ?, hero_title = ?, hero_description = ?, 
        about_lead = ?, about_bio = ?, 
        stat_years = ?, stat_projects = ?, stat_companies = ?,
        cube_front = ?, cube_back = ?, cube_right = ?, cube_left = ?, cube_top = ?, cube_bottom = ?,
        cv_file = ?, profile_image = ?, email = ?, phone = ?, location = ?, linkedin_link = ?, github_link = ?,
        gemini_api_key = COALESCE(NULLIF(?, ''), gemini_api_key),
        gemini_model = ?
        WHERE lang = ?`,
        [
            hero_subtitle, hero_title, hero_description, 
            about_lead, about_bio, 
            stat_years, stat_projects, stat_companies,
            cube_front, cube_back, cube_right, cube_left, cube_top, cube_bottom,
            cvPath, imagePath, email, phone, location, linkedin_link, github_link,
            gemini_api_key,
            gemini_model || 'gemini-1.5-flash', // Default if missing
            targetLang
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log('Update result:', this.changes); 
            res.json({ message: "Updated successfully", changes: this.changes });
        }
    );


// --- ARTICLES ---
app.get('/api/articles', (req, res) => {
    const lang = req.query.lang || 'en';
    db.all("SELECT * FROM articles WHERE lang = ? ORDER BY date DESC", [lang], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/articles', authenticateToken, upload.single('imageFile'), (req, res) => {
    const { title, summary, link, date, tags, is_hidden, lang, image } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : image;

    db.run(`INSERT INTO articles (title, summary, link, date, tags, image, is_hidden, lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, summary, link, date, tags, imagePath, is_hidden || 0, lang || 'en'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/articles/:id', authenticateToken, upload.single('imageFile'), (req, res) => {
    const { title, summary, link, date, tags, is_hidden, image } = req.body;
    let imagePath = image;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    db.run(`UPDATE articles SET title = ?, summary = ?, link = ?, date = ?, tags = ?, image = ?, is_hidden = ? WHERE id = ?`,
        [title, summary, link, date, tags, imagePath, is_hidden, req.params.id],
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

// --- DYNAMIC STATS ---
app.get('/api/stats', (req, res) => {
    const lang = req.query.lang || 'en';
    const stats = {};

    // Use Promises for parallel DB queries
    const queries = [
        new Promise((resolve) => {
            db.get("SELECT MIN(year) as start_year FROM experience WHERE is_hidden = 0", [], (err, row) => {
                if (row && row.start_year) {
                    // Extract year if it's "2020 - Present" format, just take the first 4 digits
                    const match = row.start_year.match(/(\d{4})/);
                    const start = match ? parseInt(match[0]) : new Date().getFullYear();
                    stats.years = new Date().getFullYear() - start + 1; // +1 to count current year
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

    // 1. Get Settings (Key & Model) and Context
    db.get("SELECT gemini_api_key, gemini_model FROM general_info WHERE lang = ? LIMIT 1", [targetLang], async (err, row) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!row || !row.gemini_api_key) return res.status(500).json({ error: "Chatbot not configured (API Key missing)." });

        const apiKey = row.gemini_api_key;
        const modelName = row.gemini_model || "gemini-1.5-flash"; // Use selected model
        
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
            const projects = await getAsync("SELECT title, description, tags, category FROM projects WHERE is_hidden = 0 AND lang = ?", [targetLang]);
            const skills = await getAsync("SELECT name, category, level FROM skills WHERE is_hidden = 0 AND lang = ?", [targetLang]);
            const experience = await getAsync("SELECT role, company, year, description FROM experience WHERE is_hidden = 0 AND lang = ?", [targetLang]);
            const education = await getAsync("SELECT degree, institution, year, description FROM education WHERE is_hidden = 0 AND lang = ?", [targetLang]);
            const certs = await getAsync("SELECT name, issuer, year, domain FROM certifications WHERE is_hidden = 0 AND lang = ?", [targetLang]);

            // 3. Construct System Prompt
            const portfolioOwner = general.hero_subtitle || "Adnane Yadani";
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
                Contact: Email: ${general.email}, LinkedIn: ${general.linkedin_link}

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
            res.json({ reply: responseText });

        } catch (error) {
            console.error("Gemini Error:", error);
            // More detailed client error if possible, but keep secure
            res.status(500).json({ error: "Failed to generate response. Check API Key or Model selection." });
        }
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
    const { type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden, lang } = req.body;
    db.run(`INSERT INTO shapes (type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden, lang) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type || 'cube', face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden || 0, lang || 'en'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/shapes/:id', authenticateToken, (req, res) => {
    const { type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden } = req.body;
    db.run(`UPDATE shapes SET type = ?, face_front = ?, face_back = ?, face_right = ?, face_left = ?, face_top = ?, face_bottom = ?, size = ?, pos_x = ?, pos_y = ?, icon = ?, is_hidden = ? WHERE id = ?`,
        [type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

app.delete('/api/shapes/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM shapes WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

// --- CONTACT / MESSAGES ---
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'yadani.adnane20@gmail.com', // User's email
        pass: process.env.EMAIL_PASS // App Password from Env
    }
});

app.post('/api/contact', sanitizeMiddleware, (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required" });
    }

    db.run(`INSERT INTO messages (name, email, message) VALUES (?, ?, ?)`,
        [name, email, message],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Send Email Notification
            const mailOptions = {
                from: 'yadani.adnane20@gmail.com',
                to: 'yadani.adnane20@gmail.com',
                subject: `New Portfolio Message from ${name}`,
                text: `You have a new message from your portfolio:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                    // Don't fail the request if email fails, just log it
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

            res.json({ message: "Message sent successfully", id: this.lastID });
        }
    );
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
// SERVE FRONTEND (MUST BE LAST)
// =========================================
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

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
