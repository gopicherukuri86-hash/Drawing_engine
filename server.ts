import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support up to 10MB image uploads
  app.use(express.json({ limit: "10mb" }));

  // API Route: Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", engine: "Reconstructive Drawing Engine" });
  });

  // API Route: Generate Drawing Step-by-Step Tutorial
  app.post("/api/generate-drawing", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing" });
        return;
      }

      const { prompt, imageBase64, mimeType, complexity } = req.body;

      if (!prompt && !imageBase64) {
        res.status(400).json({ error: "Either a text prompt or an image must be provided" });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `You are an expert, friendly art teacher for young children. Your task is to act as a "Reconstructive Drawing Engine."
The user will provide either a text idea (e.g., "a flying pirate ship") or upload an image (a photograph, a toy, or a rough scribble).

Your job is to visually deconstruct the subject into basic geometric shapes (circles, ovals, simple lines) that a 5-year-old can easily draw, and output a complete step-by-step tutorial in a single payload.

**Output Format:**
You must output a single JSON array containing a dynamic number of step objects. Use as many or as few steps as necessary based on the complexity of the drawing (typically between 2 to 8 steps).

Each object in the array must contain exactly these three keys:
1. "step_number": (Integer) The sequential step number starting from 1.
2. "instruction": (String) A kid-friendly, enthusiastic instruction (e.g., "Let's draw a big round circle for the teddy bear's tummy!").
3. "svg_code": (String) Clean SVG tags or paths for this current step's new strokes ONLY (e.g., <path d="M..." stroke="#1e293b" stroke-width="8" stroke-linecap="round" fill="none" /> or <circle cx="250" cy="250" r="80" stroke="#1e293b" stroke-width="8" fill="none" />).

**Strict SVG Rules:**
* The canvas must be a standard 500x500 viewBox (\`<svg viewBox="0 0 500 500">\`).
* Mentally map the entire final drawing onto this 500x500 grid FIRST, centered nicely, so every coordinate in every step perfectly aligns and builds upon the previous steps.
* Do not redraw previous shapes in the current step's \`svg_code\`. Each step should ONLY contain the new paths being drawn in that step.
* Make sure every element has explicit styling like \`stroke="#1e293b"\` (or bold kid-friendly outline color), \`stroke-width="8"\` (or 6-10px thick for kids), \`stroke-linecap="round"\`, \`stroke-linejoin="round"\`, and \`fill="none"\` (unless coloring in a small accent like an eye or nose).
* In each step's \`svg_code\`, wrap the shapes or elements so they render correctly when appended inside a single standard \`<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">\` container on the frontend.
* Complexity preference: ${complexity || 'standard'} steps (2-8 steps max).
* Keep lines thick, smooth, bold, and easy for a child to copy.`;

      const parts: any[] = [];

      if (imageBase64) {
        // Strip data URI header if present
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: mimeType || "image/png",
            data: cleanBase64,
          },
        });
      }

      if (prompt) {
        parts.push({ text: `Subject to deconstruct into step-by-step drawing instructions for kids: ${prompt}` });
      } else if (imageBase64) {
        parts.push({ text: "Deconstruct this uploaded image into simple geometric shapes step-by-step for a child to draw." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts },
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step_number: { type: Type.INTEGER, description: "Sequential step integer starting at 1" },
                instruction: { type: Type.STRING, description: "Enthusiastic kid-friendly instruction" },
                svg_code: { type: Type.STRING, description: "Clean valid SVG elements for this step only" },
              },
              required: ["step_number", "instruction", "svg_code"],
            },
          },
        },
      });

      const rawText = response.text || "[]";
      let steps = [];
      try {
        steps = JSON.parse(rawText);
      } catch (err) {
        console.error("Failed to parse Gemini output as JSON:", rawText);
        // Fallback or retry format cleanup
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          steps = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not extract valid JSON array from model output.");
        }
      }

      res.json({
        success: true,
        steps,
      });
    } catch (error: any) {
      console.error("Error generating drawing tutorial:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Failed to generate drawing tutorial",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Reconstructive Drawing Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
