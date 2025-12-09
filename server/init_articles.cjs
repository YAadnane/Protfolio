const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'portfolio.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        summary TEXT,
        link TEXT,
        date TEXT,
        image TEXT,
        tags TEXT,
        is_hidden INTEGER DEFAULT 0,
        lang TEXT DEFAULT 'en'
    )`, (err) => {
        if (err) console.error("Error creating table:", err);
        else console.log("Articles table created successfully.");
    });
});

db.close();
