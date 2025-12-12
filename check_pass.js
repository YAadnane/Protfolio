
import bcrypt from 'bcrypt';

const hash = '$2b$10$HREwPsOL57zGfNOb7tfdMuHB4HkrTA.lYC2AFc9VePxJQPnXmvT5a';
const passwords = ['admin', 'password', '123456', 'portfolio', 'admin123', 'secret'];

async function check() {
    for (const p of passwords) {
        const match = await bcrypt.compare(p, hash);
        if (match) {
            console.log(`MATCH FOUND: ${p}`);
            return;
        }
    }
    console.log("No match found in common list.");
}

check();
