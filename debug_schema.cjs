const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/portfolio.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Checking schema...");
    db.all("PRAGMA table_info(analytics_events)", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log("analytics_events columns:", rows.map(r => r.name));
        
        const hasDate = rows.some(r => r.name === 'date');
        console.log("Has 'date' column?", hasDate);
    });
    
    db.all("PRAGMA table_info(visits)", (err, rows) => {
        console.log("visits columns:", rows.map(r => r.name));
        const hasDate = rows.some(r => r.name === 'date');
        console.log("Has 'date' column?", hasDate);
    });
});
