
import db from './server/database.js';

// Wait for DB to initialize (it has some async migrations)
setTimeout(() => {
    db.all("SELECT * FROM users", (err, rows) => {
        if (err) {
            console.error("Error querying users:", err.message);
        } else {
            console.log("Users in DB:", JSON.stringify(rows, null, 2));
        }
        
        // Also check if table exists schema
        db.all("PRAGMA table_info(users)", (err, schema) => {
            console.log("Users schema:", JSON.stringify(schema, null, 2));
            process.exit(0);
        });
    });
}, 2000); // 2s wait for init
