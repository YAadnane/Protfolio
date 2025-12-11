
import db from './database.js';

const sql = `SELECT id, title, role, year, subject, tasks FROM projects ORDER BY id DESC LIMIT 1`;

db.get(sql, [], (err, row) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('LAST PROJECT DB ENTRY:');
        console.log(JSON.stringify(row, null, 2));
    }
});
