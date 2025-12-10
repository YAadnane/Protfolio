import sqlite3 from 'sqlite3';
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'portfolio.db');

const db = new sqlite3.Database(dbPath);

console.log("Starting Diagnostic...");

db.get("SELECT gemini_api_key FROM general_info LIMIT 1", async (err, row) => {
    if (err) {
        console.error("DB Error:", err);
        return;
    }
    if (!row || !row.gemini_api_key) {
        console.error("No API Key found in DB.");
        return;
    }

    const key = row.gemini_api_key.trim();
    console.log(`API Key found (length: ${key.length}): ${key.substring(0, 5)}...`);

    const genAI = new GoogleGenerativeAI(key);

    // Test 1: Gemini 1.5 Flash
    console.log("\n--- Testing gemini-1.5-flash ---");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you working?");
        console.log("SUCCESS! Response:", result.response.text());
    } catch (e) {
        console.error("FAILURE 1.5:", e.message);
        if (e.response) console.error("Details:", JSON.stringify(e.response, null, 2));
    }

    // Test 2: Gemini 2.5 Flash (User's preferred)
    console.log("\n--- Testing gemini-2.5-flash ---");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Hello, are you working?");
        console.log("SUCCESS! Response:", result.response.text());
    } catch (e) {
        console.error("FAILURE 2.5:", e.message);
         // console.error("Full Error:", e);
    }
    
    // Test 3: List Models (if supported)
    // accessible via API directly usually, checking if SDK has it easily? 
    // skipping for now, direct generation test is most important.

    db.close();
});
