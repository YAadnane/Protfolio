import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/portfolio.db');

const db = new sqlite3.Database(dbPath);

const runMigration = () => {
    console.log("Starting migration on", dbPath);
    
    const addCol = (table, col, type) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {
            if (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log(`Column ${col} already exists in ${table}`);
                } else {
                    console.error(`Error adding ${col} to ${table}:`, err.message);
                }
            } else {
                console.log(`Successfully added ${col} to ${table}`);
            }
        });
    };

    // Visits table
    addCol('visits', 'lang', "TEXT DEFAULT 'en'");
    addCol('visits', 'device', "TEXT DEFAULT 'desktop'");

    // Projects/Certs/Articles might need 'lang' if they don't have it (though database.js said they do)
    // Let's verify and add if needed provided 'lang' support is expected there.
    // server/database.js lines 290-296 added 'lang' to these. 
    // I'll run those too just in case.
    addCol('general_info', 'lang', "TEXT DEFAULT 'en'");
    addCol('projects', 'lang', "TEXT DEFAULT 'en'");
    addCol('certifications', 'lang', "TEXT DEFAULT 'en'");
    addCol('articles', 'lang', "TEXT DEFAULT 'en'");
    addCol('shapes', 'lang', "TEXT DEFAULT 'en'");
    addCol('skills', 'lang', "TEXT DEFAULT 'en'");
    addCol('experience', 'lang', "TEXT DEFAULT 'en'");
    addCol('education', 'lang', "TEXT DEFAULT 'en'");

    setTimeout(() => {
        console.log("Migration attempts finished.");
    }, 2000);
};

runMigration();
