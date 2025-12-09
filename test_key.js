import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyBtwvj4uzpEka1Yue97nsVRH8SsslsnpgM";
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
    console.log("Testing API Key...");
    try {
        // Method 1: Try to list models (might be restricted)
        // Note: genAI.getGenerativeModel is for generation. 
        // There is no direct "listModels" on the instance in some versions, but let's try generation.
        
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
        
        for (const m of models) {
            console.log(`\nTesting model: ${m}`);
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hello, are you working?");
                console.log(`[SUCCESS] ${m}`);
            } catch (e) {
                console.log(`[FAILED] ${m}`);
                console.log("Error Name:", e.name);
                console.log("Error Msg:", e.message);
                if (e.status) console.log("Status:", e.status);
                if (e.statusText) console.log("StatusText:", e.statusText);
            }
        }

    } catch (error) {
        console.error("Global Error:", error);
    }
}

test();
