import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  console.log("Key starts with:", process.env.GEMINI_API_KEY?.substring(0, 5));
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "hello",
    });
    console.log("Success:", response.text ? "Yes" : "No");
  } catch (e) {
    console.error("API Error:", e.message);
  }
}
test();
