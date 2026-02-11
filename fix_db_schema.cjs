const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/portfolio.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Starting schema update...");

    // Add notion_link to education
    db.run("ALTER TABLE education ADD COLUMN notion_link TEXT", (err) => {
        if (err) {
            if (err.message.includes("duplicate column")) {
                console.log("Column 'notion_link' already exists in 'education'.");
            } else {
                console.error("Error adding column to 'education':", err.message);
            }
        } else {
            console.log("Successfully added 'notion_link' to 'education'.");
        }
    });

    // Add notion_link to experience
    db.run("ALTER TABLE experience ADD COLUMN notion_link TEXT", (err) => {
        if (err) {
            if (err.message.includes("duplicate column")) {
                console.log("Column 'notion_link' already exists in 'experience'.");
            } else {
                console.error("Error adding column to 'experience':", err.message);
            }
        } else {
            console.log("Successfully added 'notion_link' to 'experience'.");
        }
    });
});

db.close(() => {
    console.log("Schema update complete.");
});
