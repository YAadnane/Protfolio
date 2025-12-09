const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'portfolio.db');
const db = new sqlite3.Database(dbPath);

const tables = ['projects', 'experience', 'education', 'certifications'];

db.serialize(() => {
    tables.forEach(table => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) {
                console.error(`Error checking ${table}:`, err);
                return;
            }
            const hasLang = rows.some(r => r.name === 'lang');
            if (!hasLang) {
                console.log(`Adding lang to ${table}...`);
                db.run(`ALTER TABLE ${table} ADD COLUMN lang TEXT DEFAULT 'en'`, (err) => {
                    if (err) console.error(`Failed to alter ${table}:`, err);
                    else console.log(`Successfully added lang to ${table}`);
                });
            } else {
                console.log(`${table} already has lang.`);
            }
        });
    });
});
