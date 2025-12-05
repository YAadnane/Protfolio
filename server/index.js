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
app.use(bodyParser.json());
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
    db.all("SELECT * FROM projects", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/projects', upload.single('imageFile'), sanitizeMiddleware, authenticateToken, (req, res) => {
    const { title, description, tags, link, category, image, is_hidden } = req.body;
    // Use uploaded file path if exists, otherwise fallback to provided image string (e.g. class name)
    const imagePath = req.file ? `/uploads/${req.file.filename}` : image;

    db.run(`INSERT INTO projects (title, description, tags, image, link, category, is_hidden) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, description, tags, imagePath, link, category, is_hidden || 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/projects/:id', upload.single('imageFile'), sanitizeMiddleware, authenticateToken, (req, res) => {
    const { title, description, tags, link, category, image, is_hidden } = req.body;
    
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
    db.all("SELECT * FROM certifications", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/certifications', upload.single('pdfFile'), authenticateToken, (req, res) => {
    const { name, issuer, icon, year, domain, pdf, is_hidden } = req.body;
    const pdfPath = req.file ? `/uploads/${req.file.filename}` : pdf;

    db.run(`INSERT INTO certifications (name, issuer, icon, year, domain, pdf, is_hidden) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, issuer, icon, year, domain, pdfPath, is_hidden || 0],
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
    db.all("SELECT * FROM education", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/education', authenticateToken, (req, res) => {
    const { degree, institution, year, description, is_hidden } = req.body;
    db.run(`INSERT INTO education (degree, institution, year, description, is_hidden) VALUES (?, ?, ?, ?, ?)`,
        [degree, institution, year, description, is_hidden || 0],
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
    db.all("SELECT * FROM experience", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/experience', authenticateToken, (req, res) => {
    const { role, company, year, description, is_hidden } = req.body;
    db.run(`INSERT INTO experience (role, company, year, description, is_hidden) VALUES (?, ?, ?, ?, ?)`,
        [role, company, year, description, is_hidden || 0],
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
    db.all("SELECT * FROM skills", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/skills', authenticateToken, (req, res) => {
    const { category, name, level, icon, is_hidden } = req.body;
    db.run(`INSERT INTO skills (category, name, level, icon, is_hidden) VALUES (?, ?, ?, ?, ?)`,
        [category, name, level, icon, is_hidden || 0],
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
app.get('/api/general', (req, res) => {
    db.get("SELECT * FROM general_info WHERE id = 1", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {});
    });
});

app.put('/api/general', upload.single('cvFile'), sanitizeMiddleware, authenticateToken, (req, res) => {
    const { 
        hero_subtitle, hero_title, hero_description, 
        about_lead, about_bio, 
        stat_years, stat_projects, stat_companies,
        cube_front, cube_back, cube_right, cube_left, cube_top, cube_bottom,
        email, phone, location, linkedin_link, github_link,
        cv_file // Existing file path if not uploading new one
    } = req.body;

    let cvPath = cv_file;
    if (req.file) {
        cvPath = `/uploads/${req.file.filename}`;
    }

    db.run(`UPDATE general_info SET 
        hero_subtitle = ?, hero_title = ?, hero_description = ?, 
        about_lead = ?, about_bio = ?, 
        stat_years = ?, stat_projects = ?, stat_companies = ?,
        cube_front = ?, cube_back = ?, cube_right = ?, cube_left = ?, cube_top = ?, cube_bottom = ?,
        cv_file = ?, email = ?, phone = ?, location = ?, linkedin_link = ?, github_link = ?
        WHERE id = 1`,
        [
            hero_subtitle, hero_title, hero_description, 
            about_lead, about_bio, 
            stat_years, stat_projects, stat_companies,
            cube_front, cube_back, cube_right, cube_left, cube_top, cube_bottom,
            cvPath, email, phone, location, linkedin_link, github_link
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

app.delete('/api/skills/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM skills WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});



// --- SHAPES ---
app.get('/api/shapes', (req, res) => {
    db.all("SELECT * FROM shapes", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/shapes', authenticateToken, (req, res) => {
    const { type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden } = req.body;
    db.run(`INSERT INTO shapes (type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type || 'cube', face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon, is_hidden || 0],
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
