
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'portfolio.db');
const db = new sqlite3.Database(dbPath);

console.log('Seeding analytics data to: ' + dbPath);

const now = new Date();
const events = ['click_project', 'click_certif', 'view_article'];
const userAgents = ['Mozilla/5.0', 'Chrome/90.0', 'Safari/14.0'];

db.serialize(() => {
    // Ensure tables exist
    db.run(`CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_hash TEXT,
        user_agent TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT, 
        target_id INTEGER,
        metadata TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 1. Seed Visits (Last 60 days)
    const stmtVisit = db.prepare("INSERT INTO visits (ip_hash, user_agent, date) VALUES (?, ?, ?)");
    
    for (let i = 0; i < 60; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0] + ' 12:00:00';
        
        // Random number of visits per day (5 to 20)
        const dailyVisits = Math.floor(Math.random() * 15) + 5;
        
        for (let v = 0; v < dailyVisits; v++) {
            stmtVisit.run(
                `hash_${Math.pow(Math.random(), 5)}`, 
                userAgents[Math.floor(Math.random() * userAgents.length)], 
                dateStr
            );
        }
    }
    stmtVisit.finalize();
    console.log('Visits seeded.');

    // 2. Seed Analytics Events (Last 60 days)
    const stmtEvent = db.prepare("INSERT INTO analytics_events (event_type, target_id, date) VALUES (?, ?, ?)");
    
    // We assume some projects/certifs exist with IDs 1-10
    // If not, these events might be orphaned in the join, but some should match
    for (let i = 0; i < 500; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - Math.floor(Math.random() * 60));
        
        const type = events[Math.floor(Math.random() * events.length)];
        const targetId = Math.floor(Math.random() * 5) + 1; // IDs 1-5
        
        stmtEvent.run(type, targetId, date.toISOString());
    }
    stmtEvent.finalize();
    console.log('Events seeded.');
});

db.close(() => {
    console.log('Done!');
});
