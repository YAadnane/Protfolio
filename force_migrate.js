
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/portfolio.db');
const db = new sqlite3.Database(dbPath);

const defaultHash = '$2b$10$AvzbJGVzQRk7zEP1YZiM2effU.2865ZE3vfBKsVx1miNLvDrhu.qgG'; // admin

db.serialize(() => {
    console.log("Forcing migration on:", dbPath);
    
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT
    )`, (err) => {
        if (err) {
            console.error("Create table failed:", err.message);
        } else {
            console.log("Table 'users' ensured.");
            
            db.get("SELECT count(*) as count FROM users", (err, row) => {
                if (err) {
                    console.error("Count failed:", err.message);
                } else if (row && row.count === 0) {
                    db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", ['admin', defaultHash], (err) => {
                        if (err) console.error("Seed failed:", err.message);
                        else console.log("Seeded admin user.");
                    });
                } else {
                    console.log("User already exists count:", row.count);
                }
            });
        }
    });
});
