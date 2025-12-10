import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'portfolio.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Current General Info Configs ---");
    db.all("SELECT id, lang, gemini_model, length(gemini_api_key) as key_len FROM general_info", (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });

    console.log("--- Updating Model to gemini-2.5-flash ---");
    db.run("UPDATE general_info SET gemini_model = 'gemini-2.5-flash'", function(err) {
        if (err) console.error("Update Error:", err);
        else console.log(`Updated ${this.changes} rows to gemini-2.5-flash.`);
    });
    
    // Force 'en' row to have the same key/model as 'fr' if 'en' is missing key but 'fr' has it? 
    // Or just rely on the fallback logic I added to index.js.
    // The previous index.js fix should handle the fallback. The DB update here handles the "Invalid Model" error.
});

db.close();
