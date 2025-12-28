import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/portfolio.db');
const db = new sqlite3.Database(dbPath);

const queries = [
    'SELECT COUNT(*) as c FROM projects',
    'SELECT COUNT(*) as c FROM messages WHERE is_read=0',
    'SELECT COUNT(*) as c FROM reviews WHERE is_approved=0',
    'SELECT COUNT(*) as c FROM visits WHERE date >= date("now", "-7 days")'
];

queries.forEach(q => {
    db.get(q, (err, row) => {
        if (err) console.error(`Query "${q}" FAILED:`, err.message);
        else console.log(`Query "${q}" OK:`, row);
    });
});
