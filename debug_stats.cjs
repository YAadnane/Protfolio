const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/portfolio.db');
const db = new sqlite3.Database(dbPath);

const year = '2025';
const month = ''; // Test empty month

let filterParams = [];
let filterSql = "";

if (year) {
    filterSql += " AND strftime('%Y', date) = ?";
    filterParams.push(year);
}
if (month) {
    filterSql += " AND strftime('%m', date) = ?";
    filterParams.push(month.toString().padStart(2, '0'));
}

let eventFilterSql = filterSql.replace(/date/g, 'e.date');

console.log("Filter SQL:", filterSql);
console.log("Event Filter SQL:", eventFilterSql);
console.log("Params:", filterParams);

db.serialize(() => {
    // Test 1: Visits
    db.get(`SELECT COUNT(*) as c FROM visits WHERE 1=1 ${filterSql}`, filterParams, (err, row) => {
        if (err) console.error("Visits Error:", err);
        else console.log("Visits:", row);
    });

    // Test 2: Events
    db.get(`SELECT COUNT(*) as c FROM analytics_events e WHERE 1=1 ${eventFilterSql}`, filterParams, (err, row) => {
        if (err) console.error("Events Error:", err);
        else console.log("Events:", row);
    });

    // Test 3: Top Projects
    db.all(`
        SELECT COALESCE(p.title, 'Unknown Project #' || e.target_id) as name, COUNT(e.id) as clicks 
        FROM analytics_events e 
        LEFT JOIN projects p ON e.target_id = p.id 
        WHERE e.event_type = 'click_project' ${eventFilterSql}
        GROUP BY e.target_id 
        ORDER BY clicks DESC 
        LIMIT 5
    `, filterParams, (err, rows) => {
        if (err) console.error("Top Projects Error:", err);
        else console.log("Top Projects:", rows);
    });
});
