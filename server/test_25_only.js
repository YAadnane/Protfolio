import sqlite3 from 'sqlite3';
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'portfolio.db');

const db = new sqlite3.Database(dbPath);

console.log("Starting Diagnostic 2.5 ONLY...");

db.get("SELECT gemini_api_key FROM general_info LIMIT 1", async (err, row) => {
    if (err || !row || !row.gemini_api_key) {
        console.error("DB/Key Error");
        return;
    }

    const key = row.gemini_api_key.trim();
    const genAI = new GoogleGenerativeAI(key);

    console.log("\n--- Testing gemini-2.5-flash ---");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Hello?");
        console.log("SUCCESS! Response:", result.response.text());
    } catch (e) {
        console.error("FAILURE 2.5:", e.message);
        if (e.response) console.error("Details:", JSON.stringify(e.response, null, 2));
    }
    
    db.close();
});
