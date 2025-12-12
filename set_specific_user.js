
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/portfolio.db');
const db = new sqlite3.Database(dbPath);

const email = 'yadani.adnane20@gmail.com';
const password = 'M131524628@ud14142';

console.log("Setting credentials for:", email);

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error("Hashing error:", err);
        return;
    }
    
    db.serialize(() => {
        // Clear existing users to avoid conflicts/confusion (Single Admin Policy usually)
        db.run("DELETE FROM users", (err) => {
            if (err) console.error("Clear users failed:", err);
            else console.log("Users table cleared.");
        });

        const stmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        stmt.run(email, hash, (err) => {
            if (err) {
                console.log("Insert failed:", err.message);
            } else {
                console.log("User successfully created/updated.");
            }
        });
        stmt.finalize();
    });
});
