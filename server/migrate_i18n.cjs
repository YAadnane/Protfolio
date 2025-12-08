const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../portfolio.db');
const db = new sqlite3.Database(dbPath);

const tables = [
    'general_info',
    'projects',
    'education',
    'experience',
    'certifications',
    'skills',
    'shapes'
];

db.serialize(() => {
    tables.forEach(table => {
        // 1. Check if column exists
        db.all(`PRAGMA table_info(${table})`, (err, columns) => {
            if (err) {
                console.error(`Error reading ${table} schema:`, err);
                return;
            }

            const hasLang = columns.some(col => col.name === 'lang');
            if (hasLang) {
                console.log(`Table ${table} already has 'lang' column.`);
                return;
            }

            console.log(`Migrating table: ${table}...`);

            // 2. Add 'lang' column
            db.run(`ALTER TABLE ${table} ADD COLUMN lang TEXT DEFAULT 'en'`, (err) => {
                if (err) {
                    console.error(`Error adding column to ${table}:`, err);
                    return;
                }
                console.log(`Added 'lang' column to ${table}.`);

                // 3. Duplicate content for 'fr'
                const dataCols = columns.map(c => c.name).filter(n => n !== 'id' && n !== 'lang');
                
                const colNames = dataCols.join(', ');
                const insertSql = `INSERT INTO ${table} (${colNames}, lang) SELECT ${colNames}, 'fr' FROM ${table} WHERE lang='en'`;
                
                db.run(insertSql, (err) => {
                     if (err) console.error(`Error duplicating duplicates for ${table}:`, err);
                     else console.log(`Duplicated 'en' content to 'fr' for ${table}.`);
                });
            });
        });
    });
});
