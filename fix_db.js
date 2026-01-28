
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct path to DB based on where we run this script
// If running from root, and file is in root, we need to point to server/portfolio.db
const dbPath = path.resolve('server/portfolio.db');
console.log('Target DB:', dbPath);

const verboseSqlite = sqlite3.verbose();
const db = new verboseSqlite.Database(dbPath);

const createTableSQL = `
CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    unsubscribed_at DATETIME
);
`;

const createIndexSQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
`;

db.serialize(() => {
    db.run(createTableSQL, (err) => {
        if (err) {
            console.error("Error creating table:", err);
        } else {
            console.log("Table 'subscribers' created or already exists.");
            
            db.run(createIndexSQL, (err) => {
                 if (err) console.error("Error creating index:", err);
                 else console.log("Index created.");
                 
                 // Migration: Add columns if they don't exist
                db.all("PRAGMA table_info(subscribers)", (err, rows) => {
                    if (!err) {
                        const hasUnsub = rows.some(r => r.name === 'unsubscribed_at');
                        if (!hasUnsub) {
                            db.run("ALTER TABLE subscribers ADD COLUMN unsubscribed_at DATETIME");
                            console.log("Added unsubscribed_at column.");
                        }
                         const hasActive = rows.some(r => r.name === 'is_active');
                        if (!hasActive) {
                            db.run("ALTER TABLE subscribers ADD COLUMN is_active INTEGER DEFAULT 1");
                             console.log("Added is_active column.");
                        }
                    }
                });
            });

            // Insert a test subscriber
            db.run("INSERT OR IGNORE INTO subscribers (name, email) VALUES (?, ?)", ['Test Subscriber', 'test@example.com'], function(err) {
                if(err) console.error("Insert error:", err);
                else console.log(`Test subscriber inserted/ignored. Changes: ${this.changes}`);
            });
            
             // Verify
            db.all("SELECT * FROM subscribers", (err, rows) => {
                if(err) console.error("Select error:", err);
                else console.log("Current Subscribers:", rows);
                db.close();
            });
        }
    });
});
// db.close() removed from here
