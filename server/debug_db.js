import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'portfolio.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking database at:", dbPath);

db.serialize(() => {
    db.all("SELECT * FROM education", (err, rows) => {
        if (err) {
            console.error("Error reading education:", err);
        } else {
            console.log("Education rows:", rows.length);
            console.log(JSON.stringify(rows, null, 2));
        }
    });

    db.all("SELECT * FROM experience", (err, rows) => {
        if (err) {
            console.error("Error reading experience:", err);
        } else {
            console.log("Experience rows:", rows.length);
            console.log(JSON.stringify(rows, null, 2));
        }
    });
});

db.close();
