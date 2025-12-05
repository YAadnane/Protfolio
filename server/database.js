import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const verboseSqlite = sqlite3.verbose();
const dbPath = path.resolve(__dirname, 'portfolio.db');
const db = new verboseSqlite.Database(dbPath);

db.serialize(() => {
    // Helper for migration
    const addColumnIfNotExists = (table, column, type) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (!err) {
                const hasColumn = rows.some(r => r.name === column);
                if (!hasColumn) {
                    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
                    console.log(`Added '${column}' column to ${table} table.`);
                }
            }
        });
    };

    // Projects Table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        tags TEXT,
        image TEXT,
        link TEXT,
        category TEXT,
        is_hidden INTEGER DEFAULT 0
    )`, () => addColumnIfNotExists('projects', 'is_hidden', 'INTEGER DEFAULT 0'));

    // Certifications Table
    db.run(`CREATE TABLE IF NOT EXISTS certifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        issuer TEXT,
        icon TEXT,
        year TEXT,
        domain TEXT,
        pdf TEXT,
        is_hidden INTEGER DEFAULT 0
    )`, () => {
        addColumnIfNotExists('certifications', 'is_hidden', 'INTEGER DEFAULT 0');
        addColumnIfNotExists('certifications', 'domain', 'TEXT');
        addColumnIfNotExists('certifications', 'pdf', 'TEXT');
    });

    // Education Table
    db.run(`CREATE TABLE IF NOT EXISTS education (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        degree TEXT,
        institution TEXT,
        year TEXT,
        description TEXT,
        is_hidden INTEGER DEFAULT 0
    )`, () => addColumnIfNotExists('education', 'is_hidden', 'INTEGER DEFAULT 0'));

    // Experience Table
    db.run(`CREATE TABLE IF NOT EXISTS experience (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT,
        company TEXT,
        year TEXT,
        description TEXT,
        is_hidden INTEGER DEFAULT 0
    )`, () => addColumnIfNotExists('experience', 'is_hidden', 'INTEGER DEFAULT 0'));

    // Skills Table
    db.run(`CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        name TEXT,
        level INTEGER,
        icon TEXT,
        is_hidden INTEGER DEFAULT 0
    )`, () => addColumnIfNotExists('skills', 'is_hidden', 'INTEGER DEFAULT 0'));

    // Messages Table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        message TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read INTEGER DEFAULT 0
    )`, () => {
        addColumnIfNotExists('messages', 'is_read', 'INTEGER DEFAULT 0');
    });

    // General Info Table (Single Row)
    db.run(`CREATE TABLE IF NOT EXISTS general_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hero_subtitle TEXT,
        hero_title TEXT,
        hero_description TEXT,
        about_lead TEXT,
        about_bio TEXT,
        stat_years INTEGER,
        stat_projects INTEGER,
        stat_companies INTEGER,
        cube_front TEXT,
        cube_back TEXT,
        cube_right TEXT,
        cube_left TEXT,
        cube_top TEXT,
        cube_bottom TEXT
    )`, (err) => {
        if (!err) {
            // Check if empty, if so seed with default values
            db.get("SELECT count(*) as count FROM general_info", (err, row) => {
                if (row.count === 0) {
                    const insert = `INSERT INTO general_info (
                        hero_subtitle, hero_title, hero_description, 
                        about_lead, about_bio, 
                        stat_years, stat_projects, stat_companies,
                        cube_front, cube_back, cube_right, cube_left, cube_top, cube_bottom
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    
                    db.run(insert, [
                        "Data Scientist & Developer",
                        "Crafting Intelligent Data Systems",
                        "I transform raw data into Actionable Insights using Artificial Intelligence and Big Data Technologies.",
                        "Aspiring Data Scientist focused on Analytics and Artificial Intelligence.",
                        "With hands-on experience in machine learning and predictive analytics, I develop user-friendly web interfaces and robust databases. I transform complex data into actionable insights.",
                        3, 10, 3,
                        "AI", "ML", "DATA", "ETL", "BI", "CODE"
                    ]);
                    console.log("General info seeded.");
                }
            });
        }
    });

    // Shapes Table (Cubes, Pyramids, Spheres)
    db.run(`CREATE TABLE IF NOT EXISTS shapes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT DEFAULT 'cube',
        face_front TEXT,
        face_back TEXT,
        face_right TEXT,
        face_left TEXT,
        face_top TEXT,
        face_bottom TEXT,
        size REAL,
        pos_x REAL,
        pos_y REAL,
        icon TEXT,
        is_hidden INTEGER DEFAULT 0
    )`, (err) => {
        if (!err) {
            // Migration: Check if columns exist
            db.all("PRAGMA table_info(shapes)", (err, rows) => {
                if (!err) {
                    const hasType = rows.some(r => r.name === 'type');
                    if (!hasType) {
                        db.run("ALTER TABLE shapes ADD COLUMN type TEXT DEFAULT 'cube'");
                    }
                    
                    const hasIcon = rows.some(r => r.name === 'icon');
                    if (!hasIcon) {
                        db.run("ALTER TABLE shapes ADD COLUMN icon TEXT");
                    }

                    const hasHidden = rows.some(r => r.name === 'is_hidden');
                    if (!hasHidden) {
                        db.run("ALTER TABLE shapes ADD COLUMN is_hidden INTEGER DEFAULT 0");
                        console.log("Added 'is_hidden' column to shapes table.");
                    }
                }
            });

            // Seed if empty
            db.get("SELECT count(*) as count FROM shapes", (err, row) => {
                if (row.count === 0) {
                    db.run(`INSERT INTO shapes (
                        type, face_front, face_back, face_right, face_left, face_top, face_bottom, size, pos_x, pos_y, icon
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        'cube', 'AI', 'ML', 'DATA', 'CODE', 'TECH', 'FUTURE', 1.0, 80, 20, 'fa-solid fa-brain'
                    ]);
                    console.log("Shapes seeded.");
                }
            });
        }
    });

    console.log("Database initialized successfully.");
});

export default db;
