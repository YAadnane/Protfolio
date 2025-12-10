import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'portfolio.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Updating Model to gemini-2.5-flash ---");
    db.run("UPDATE general_info SET gemini_model = 'gemini-2.5-flash'", function(err) {
        if (err) console.error("Update Error:", err);
        else console.log(`Updated ${this.changes} rows to gemini-2.5-flash.`);
    });
});

db.close();
