import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'portfolio.db');

const db = new sqlite3.Database(dbPath);

db.all("SELECT id, title, notion_url FROM projects WHERE notion_url IS NOT NULL AND notion_url != '' LIMIT 10", [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }
    console.log('Projects with Notion URLs:');
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
