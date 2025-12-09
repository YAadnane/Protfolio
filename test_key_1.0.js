import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyBtwvj4uzpEka1Yue97nsVRH8SsslsnpgM";
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
    console.log("Testing gemini-1.0-pro...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await model.generateContent("Hello");
        console.log("SUCCESS: ", (await result.response).text().slice(0, 20));
    } catch (e) {
        console.log("FAILED gemini-1.0-pro: ", e.message);
    }
}

test();
