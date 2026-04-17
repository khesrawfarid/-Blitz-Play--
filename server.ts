import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Site Verification Route
  app.get("/google7c842860a3292c60.html", (req, res) => {
    res.send("google-site-verification: google7c842860a3292c60.html");
  });

  // API route for generation
  app.post("/api/generate-game", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set on the server.");
        res.status(500).json({ error: "Server missing API key." });
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Create a simple, playable HTML5 game based on this prompt: "${prompt}". 
        The game should be fully contained in a single HTML string (including CSS and JS). 
        It should be responsive, use modern graphics (canvas or DOM), and be playable with mouse/touch or keyboard.
        Also provide a short, descriptive prompt for an AI image generator to create a thumbnail for this game.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              htmlCode: {
                type: Type.STRING,
                description: "The complete HTML code for the game, including <style> and <script> tags."
              },
              imagePrompt: {
                type: Type.STRING,
                description: "A prompt for an image generator to create a thumbnail for this game."
              }
            },
            required: ["htmlCode", "imagePrompt"],
          }
        }
      });
      
      const rawText = response.text || "{}";
      const cleanedText = rawText.replace(/```json\n?|\n?```/g, "").trim();
      const generatedData = JSON.parse(cleanedText);      
      
      res.json(generatedData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate game" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In express 4.x we use *
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
