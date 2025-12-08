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
        // Wrapper to ensure sequential tasks per table (conceptual)
        db.get(`SELECT count(*) as count FROM ${table} WHERE lang='fr'`, (err, row) => {
            if (err && err.message.includes('no such column')) {
                // Determine we need to add column
            }
            
            // 1. Try to add column. We do this blindly. If it fails due to duplicate, fine.
            db.run(`ALTER TABLE ${table} ADD COLUMN lang TEXT DEFAULT 'en'`, (err) => {
                const colExists = (err && err.message.includes('duplicate column'));
                if (err && !colExists) {
                    console.error(`Error adding column to ${table}:`, err.message);
                    return;
                }
                if (!err) console.log(`Added 'lang' column to ${table}.`);
                else console.log(`Column 'lang' already exists in ${table}.`);

                // 2. Refresh schema knowledge to get columns
                db.all(`PRAGMA table_info(${table})`, (err, columns) => {
                    if (err) return;

                    // 3. Check if we already have FR content
                    db.get(`SELECT count(*) as count FROM ${table} WHERE lang='fr'`, (err, row) => {
                        if (row && row.count > 0) {
                            console.log(`French content already exists for ${table} (${row.count} rows). Skipping duplication.`);
                            return;
                        }

                        console.log(`Duplicating content for ${table}...`);
                        const dataCols = columns.map(c => c.name).filter(n => n !== 'id' && n !== 'lang');
                        const colNames = dataCols.join(', ');
                        const insertSql = `INSERT INTO ${table} (${colNames}, lang) SELECT ${colNames}, 'fr' FROM ${table} WHERE lang='en'`;
                        
                        db.run(insertSql, (err) => {
                            if (err) console.error(`Error duplicating for ${table}:`, err.message);
                            else console.log(`Duplicated 'en' content to 'fr' for ${table}.`);
                        });
                    });
                });
            });
        });
    });
});
