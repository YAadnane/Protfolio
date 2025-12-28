import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/portfolio.db');
const db = new sqlite3.Database(dbPath);

const tables = ['visits', 'analytics_events', 'projects', 'certifications'];

tables.forEach(table => {
    db.get(`SELECT count(*) as c FROM ${table}`, (err, row) => {
        if (err) console.error(`Table ${table} ERROR:`, err.message);
        else console.log(`Table ${table} OK: ${row.c} rows`);
    });
});
