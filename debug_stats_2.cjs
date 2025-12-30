const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/portfolio.db');
const db = new sqlite3.Database(dbPath);

const year = '2025';

let filterParams = [];
let filterSql = "";
if (year) {
    filterSql += " AND strftime('%Y', date) = ?";
    filterParams.push(year);
}

db.serialize(() => {
    // Test Visits History
    let histQuery = `SELECT DATE(date) as day, COUNT(*) as count FROM visits WHERE 1=1 ${filterSql} GROUP BY DATE(date) ORDER BY date ASC`;
    console.log("Hist Query:", histQuery);
    
    db.all(histQuery, filterParams, (err, rows) => {
        if (err) console.error("Hist Error:", err);
        else console.log("Hist Rows:", rows.length);
    });
});
