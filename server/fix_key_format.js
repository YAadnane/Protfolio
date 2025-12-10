import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'portfolio.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Check and Fix API Key
    db.all("SELECT id, gemini_api_key FROM general_info", (err, rows) => {
        if (err) {
            console.error("Fetch Error:", err);
            return;
        }

        rows.forEach(row => {
            if (row.gemini_api_key) {
                const cleanKey = row.gemini_api_key.trim();
                if (cleanKey !== row.gemini_api_key) {
                    console.log(`Row ${row.id}: Key has whitespace. Trimming...`);
                    db.run("UPDATE general_info SET gemini_api_key = ? WHERE id = ?", [cleanKey, row.id], (err) => {
                        if (err) console.error("Update Key Error:", err);
                        else console.log(`Row ${row.id}: Key trimmed.`);
                    });
                } else {
                    console.log(`Row ${row.id}: Key is clean.`);
                }
            }
        });
    });

    // 2. Revert to gemini-1.5-flash
    console.log("Setting model to gemini-1.5-flash...");
    db.run("UPDATE general_info SET gemini_model = 'gemini-1.5-flash'", (err) => {
         if (err) console.error("Update Model Error:", err);
         else console.log("Model updated to gemini-1.5-flash.");
    });
});
