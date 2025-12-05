import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./server/portfolio.db');
db.all("SELECT * FROM general_info", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
});
