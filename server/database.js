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
        // New Fields for Modal
        addColumnIfNotExists('certifications', 'status', 'TEXT DEFAULT "obtained"');
        addColumnIfNotExists('certifications', 'description', 'TEXT');
        addColumnIfNotExists('certifications', 'skills', 'TEXT');
        addColumnIfNotExists('certifications', 'credential_id', 'TEXT');
        addColumnIfNotExists('certifications', 'credential_url', 'TEXT');
        addColumnIfNotExists('certifications', 'level', 'TEXT');
        addColumnIfNotExists('certifications', 'image', 'TEXT');
    });

    // Education Table
    db.run(`CREATE TABLE IF NOT EXISTS education (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        degree TEXT,
        institution TEXT,
        year TEXT,
        start_date TEXT, -- New
        end_date TEXT, -- New
        logo TEXT, -- New
        brochure TEXT, -- New
        description TEXT,
        is_hidden INTEGER DEFAULT 0,
        lang TEXT DEFAULT 'en'
    )`, (err) => {
        if (!err) {
            addColumnIfNotExists('education', 'is_hidden', 'INTEGER DEFAULT 0');
            addColumnIfNotExists('education', 'lang', "TEXT DEFAULT 'en'");
            // Migration
            addColumnIfNotExists('education', 'start_date', 'TEXT');
            addColumnIfNotExists('education', 'end_date', 'TEXT');
            addColumnIfNotExists('education', 'logo', 'TEXT');
            addColumnIfNotExists('education', 'brochure', 'TEXT');
        }
    });

    // Experience Table
    db.run(`CREATE TABLE IF NOT EXISTS experience (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT,
        company TEXT,
        year TEXT, 
        start_date TEXT, -- New
        end_date TEXT, -- New
        logo TEXT, -- New
        website TEXT, -- New
        linkedin TEXT, -- New
        description TEXT,
        is_hidden INTEGER DEFAULT 0,
        lang TEXT DEFAULT 'en'
    )`, (err) => {
        if (!err) {
            addColumnIfNotExists('experience', 'is_hidden', 'INTEGER DEFAULT 0');
            addColumnIfNotExists('experience', 'lang', "TEXT DEFAULT 'en'");
            // Migration
            addColumnIfNotExists('experience', 'start_date', 'TEXT');
            addColumnIfNotExists('experience', 'end_date', 'TEXT');
            addColumnIfNotExists('experience', 'logo', 'TEXT');
            addColumnIfNotExists('experience', 'website', 'TEXT');
            addColumnIfNotExists('experience', 'linkedin', 'TEXT');
        }
    });

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

    // Reviews Table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        role TEXT,
        message TEXT,
        rating INTEGER,
        social_link TEXT,
        social_platform TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_approved INTEGER DEFAULT 0
    )`, () => addColumnIfNotExists('reviews', 'is_approved', 'INTEGER DEFAULT 0'));

    // ANALYTICS: Visits Table
    db.run(`CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_hash TEXT,
        user_agent TEXT,
        lang TEXT DEFAULT 'en',
        device TEXT DEFAULT 'desktop',
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (!err) {
            addColumnIfNotExists('visits', 'date', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
            addColumnIfNotExists('visits', 'lang', "TEXT DEFAULT 'en'");
            addColumnIfNotExists('visits', 'device', "TEXT DEFAULT 'desktop'");
        }
    });

    // ANALYTICS: Events Table (Clicks)
    db.run(`CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT, -- 'click_project', 'click_certif', 'view_article'
        target_id INTEGER,
        metadata TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (!err) {
            addColumnIfNotExists('analytics_events', 'date', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        }
    });

    // INTERACTIONS: Likes Table
    // INTERACTIONS: Likes Table (v2 with Client ID)
    db.get(`SELECT count(*) as count FROM pragma_table_info('likes') WHERE name='client_id'`, (err, row) => {
        if (err || !row || row.count === 0) {
            // Migration needed or table doesn't exist
            db.run(`DROP TABLE IF EXISTS likes`); // Resetting likes for schema change to Client ID
            db.run(`CREATE TABLE likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_type TEXT, -- 'project', 'article'
                target_id INTEGER,
                client_id TEXT, -- UUID from frontend
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(target_type, target_id, client_id)
            )`);
            console.log("Migrated 'likes' table to use client_id");
        } else {
             // Ensure creation if checks passed but table missing (fallback)
             db.run(`CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_type TEXT,
                target_id INTEGER,
                client_id TEXT,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(target_type, target_id, client_id)
            )`);
        }
    });

    // INTERACTIONS: Comments Table
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_type TEXT, -- 'project', 'article'
        target_id INTEGER,
        name TEXT,
        message TEXT,
        rating INTEGER DEFAULT 0,
        is_approved INTEGER DEFAULT 0,
        social_platform TEXT,
        social_link TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if(!err) {
            addColumnIfNotExists('comments', 'social_platform', 'TEXT');
            addColumnIfNotExists('comments', 'social_link', 'TEXT');
        }
    });

    // CHATBOT: Conversations Table
    db.run(`CREATE TABLE IF NOT EXISTS chatbot_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT,
        answer TEXT,
        lang TEXT DEFAULT 'en',
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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
        cube_bottom TEXT,
        cv_file TEXT,
        email TEXT,
        phone TEXT,
        location TEXT,
        linkedin_link TEXT,
        github_link TEXT,
        lang TEXT DEFAULT 'en',
        profile_image TEXT
    )`, (err) => {
        if (!err) {
            // Migration
            addColumnIfNotExists('general_info', 'cv_file', 'TEXT');
            addColumnIfNotExists('general_info', 'email', 'TEXT');
            addColumnIfNotExists('general_info', 'phone', 'TEXT');
            addColumnIfNotExists('general_info', 'location', 'TEXT');
            addColumnIfNotExists('general_info', 'linkedin_link', 'TEXT');
            addColumnIfNotExists('general_info', 'github_link', 'TEXT');
            addColumnIfNotExists('general_info', 'lang', "TEXT DEFAULT 'en'");
            addColumnIfNotExists('general_info', 'profile_image', 'TEXT');
            addColumnIfNotExists('general_info', 'gemini_api_key', 'TEXT');
            addColumnIfNotExists('general_info', 'gemini_model', "TEXT DEFAULT 'gemini-2.5-flash'");
            addColumnIfNotExists('general_info', 'notion_api_key', 'TEXT');
            addColumnIfNotExists('general_info', 'hero_description_2', 'TEXT');
            addColumnIfNotExists('general_info', 'hero_description_3', 'TEXT');

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
                    
                    const migrations = [
                        "ALTER TABLE general_info ADD COLUMN lang TEXT DEFAULT 'en'",
                        "ALTER TABLE projects ADD COLUMN lang TEXT DEFAULT 'en'",
                        "ALTER TABLE skills ADD COLUMN lang TEXT DEFAULT 'en'",
                        "ALTER TABLE experience ADD COLUMN lang TEXT DEFAULT 'en'",
                        "ALTER TABLE education ADD COLUMN lang TEXT DEFAULT 'en'",
                        "ALTER TABLE certifications ADD COLUMN lang TEXT DEFAULT 'en'",
                        "ALTER TABLE shapes ADD COLUMN lang TEXT DEFAULT 'en'",
                        "ALTER TABLE certifications ADD COLUMN description TEXT",
                        "ALTER TABLE certifications ADD COLUMN skills TEXT",
                        "ALTER TABLE certifications ADD COLUMN credential_id TEXT",
                        "ALTER TABLE certifications ADD COLUMN credential_url TEXT",
                        "ALTER TABLE certifications ADD COLUMN level TEXT",
                        "ALTER TABLE certifications ADD COLUMN image TEXT"
                    ];

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



    // Articles Table
    db.run(`CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        summary TEXT,
        image TEXT,
        link TEXT,
        tags TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_hidden INTEGER DEFAULT 0,
        lang TEXT DEFAULT 'en'
    )`, (err) => {
        if (!err) {
            addColumnIfNotExists('articles', 'image', 'TEXT');
            addColumnIfNotExists('articles', 'link', 'TEXT');
            addColumnIfNotExists('articles', 'is_hidden', 'INTEGER DEFAULT 0');
            addColumnIfNotExists('articles', 'lang', "TEXT DEFAULT 'en'");
            addColumnIfNotExists('articles', 'updated_date', 'TEXT');

             // Seed if empty
             db.get("SELECT count(*) as count FROM articles", (err, row) => {
                /*
                if (row && row.count === 0) {
                     db.run(`INSERT INTO articles (title, summary, tags, image, date, lang) VALUES 
                        ('The Future of AI', 'How Generative AI is reshaping software development.', 'AI, Tech', '', CURRENT_TIMESTAMP, 'en'),
                        ('Optimizing SQL', 'Best practices for database performance.', 'SQL, Database', '', CURRENT_TIMESTAMP, 'en')
                     `);
                     console.log("Articles seeded.");
                }
                */
            });

            // FORCE CLEANUP: Ensure these specific default articles are removed if they exist
            db.run("DELETE FROM articles WHERE title IN ('The Future of AI', 'Optimizing SQL')");
            console.log("Cleanup: Zombie articles removed.");
        }
    });

    // Reviews Table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        role TEXT,
        message TEXT,
        rating INTEGER,
        social_link TEXT,
        social_platform TEXT,
        is_approved INTEGER DEFAULT 1,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (!err) {
            // Migration: Ensure columns exist
            addColumnIfNotExists('reviews', 'name', 'TEXT');
            addColumnIfNotExists('reviews', 'role', 'TEXT');
            addColumnIfNotExists('reviews', 'message', 'TEXT');
            addColumnIfNotExists('reviews', 'rating', 'INTEGER');
            addColumnIfNotExists('reviews', 'social_link', 'TEXT');
            addColumnIfNotExists('reviews', 'social_platform', 'TEXT');
            addColumnIfNotExists('reviews', 'is_approved', 'INTEGER DEFAULT 1');
            addColumnIfNotExists('reviews', 'date', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

            // Seed if empty
            // Seed if empty -> DISABLED to allow full deletion without respawn
            /*
            db.get("SELECT count(*) as count FROM reviews", (err, row) => {
                if (err) return console.error(err.message);
                if (row && row.count === 0) {
                     db.run(`INSERT INTO reviews (name, role, message, rating, social_link, social_platform, is_approved) VALUES 
                        ('Sarah Connor', 'CTO at TechCorp', 'Adnane delivered exceptional results. His AI expertise transformed our workflow.', 5, '', '', 1),
                        ('John Doe', 'Project Manager', 'Great communication and high quality code. Highly recommended.', 5, '', '', 1)
                     `);
                     console.log("Reviews seeded.");
                }
            });
            */
        }
    });

    console.log("Database initialized successfully.");
});

export default db;
