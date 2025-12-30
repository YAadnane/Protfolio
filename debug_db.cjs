
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'portfolio.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking database at:', dbPath);

const year = '2025';
const month = '12';

const query = `
    SELECT DATE(date) as date, COUNT(*) as count 
    FROM visits 
    WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
    GROUP BY DATE(date) 
    ORDER BY date ASC
`;

console.log('Running query:', query);
console.log('Params:', [year, month]);

db.all(query, [year, month], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('--- QUERY RESULT ---');
        console.log('Rows found:', rows.length);
        console.log(rows);
        console.log('--------------------');
    }
});

// Test strftime support
db.all("SELECT date, DATE(date) as d, strftime('%Y', date) as y, strftime('%m', date) as m FROM visits LIMIT 3", (err, rows) => {
    console.log('--- FORMAT TEST ---');
    console.log(rows);
    console.log('-------------------');
});
