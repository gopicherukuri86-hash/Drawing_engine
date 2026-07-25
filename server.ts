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

      const stepCountMap = {
        easy: "3-4 steps",
        standard: "5-6 steps",
        detailed: "7-8 steps",
      };
      const targetStepCount = stepCountMap[complexity as 'easy' | 'standard' | 'detailed'] || "5-6 steps";

      const systemInstruction = `You are an expert, friendly art teacher for young children, acting as a "Reconstructive Drawing Engine."

INPUT: a text idea ("a flying pirate ship") or an image (photo, toy, scribble).
GOAL: deconstruct the subject into basic shapes a 5-year-old can draw, and return a full step-by-step tutorial in one payload.
Target step count: ${targetStepCount}.

## 1. Plan before you draw
First fill "layout_plan": a compact text layout of the FINAL drawing on a 500x500 grid, listing every shape with exact center and size. Example: "head: circle cx 250 cy 160 r 80 | body: ellipse cx 250 cy 330 rx 110 ry 130 | left ear: circle cx 185 cy 95 r 35"
Every coordinate you emit later MUST come from this plan. Never invent new coordinates inside the steps.

## 2. Emit steps
Each step introduces ONLY the new shapes for that step. Never repeat shapes from earlier steps. Order big-to-small: large body shapes first, small details (eyes, whiskers) last.

## Geometry rules (strict)
- Canvas is viewBox="0 0 500 500". Keep ALL geometry between 40 and 460 on both axes so nothing clips at the edges.
- Allowed elements ONLY: <circle>, <ellipse>, <line>, <rect>, <polyline>, <polygon>, and <path> limited to M / L / Q commands.
- Forbidden: C / S / A curve commands, transforms, groups, CSS, animations.
- Every element must carry stroke="#1e293b" (or a bold kid-friendly colour), stroke-width="8", stroke-linecap="round", stroke-linejoin="round". Use fill="none" except for small accents like eyes and noses.
- Do NOT include the <svg> wrapper. Emit bare child elements only. The app handles all animation.

## Instructions
"instruction" = one enthusiastic kid-friendly sentence that names the shape, e.g. "Let's draw a big round circle for the teddy bear's tummy!"`;

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
          thinkingConfig: {
            thinkingLevel: 'high' as any,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING, description: "Subject of drawing" },
              layout_plan: { type: Type.STRING, description: "Compact text spatial layout plan on 500x500 grid" },
              steps: {
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
            required: ["subject", "layout_plan", "steps"],
          },
        },
      });

      const rawText = response.text || "{}";
      let payload: any = {};
      try {
        payload = JSON.parse(rawText);
      } catch (err) {
        console.error("Failed to parse Gemini output as JSON:", rawText);
        // Fallback or retry format cleanup
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          payload = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not extract valid JSON object from model output.");
        }
      }

      if (payload.layout_plan) {
        console.log("Layout Plan:", payload.layout_plan);
      }

      const steps = payload.steps || [];

      res.json({
        success: true,
        steps,
        layoutPlan: payload.layout_plan,
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
