const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./portfolio.db');

db.serialize(() => {
    db.run("PRAGMA table_info(subscribers)", (err) => {
        if(err) console.error(err);
    });
    db.each("PRAGMA table_info(subscribers)", (err, row) => {
        console.log(row.name + " (" + row.type + ")");
    });
});

db.close();
