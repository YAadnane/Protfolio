import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/portfolio.db');
const db = new sqlite3.Database(dbPath);

console.log('Running migration...');

const addColumn = (table, col, type) => {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                 console.log(`Column ${col} already exists in ${table}.`);
            } else {
                 console.error(`Error adding ${col} to ${table}:`, err.message);
            }
        } else {
            console.log(`Added ${col} to ${table}.`);
        }
    });
};

addColumn('messages', 'is_read', 'INTEGER DEFAULT 0');
addColumn('reviews', 'is_approved', 'INTEGER DEFAULT 0');

setTimeout(() => {
    console.log('Migration check complete.');
}, 2000);
