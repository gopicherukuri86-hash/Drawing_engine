import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API Route: Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", engine: "Reconstructive Scene Studio" });
  });

  const getAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" },
      },
    });
  };

  async function generateContentWithFallback(
    ai: GoogleGenAI,
    params: { contents: any; config: any }
  ) {
    const attempts = [
      { model: "gemini-3.6-flash", config: params.config },
      { model: "gemini-flash-latest", config: { ...params.config, thinkingConfig: undefined } },
      { model: "gemini-3.1-flash-lite", config: { ...params.config, thinkingConfig: undefined } },
    ];

    let lastError: any = null;
    for (let i = 0; i < attempts.length; i++) {
      try {
        const res = await ai.models.generateContent({
          model: attempts[i].model,
          contents: params.contents,
          config: attempts[i].config,
        });
        return res;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const isQuotaOr429 =
          err?.status === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("quota");
        if (isQuotaOr429 && i < attempts.length - 1) {
          console.warn(
            `Model ${attempts[i].model} hit rate limit / 429. Falling back to ${attempts[i + 1].model}...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  // IMAGE HELPERS & STYLES
  const STYLE_PROMPTS: Record<string, string> = {
    watercolour: "watercolour illustration, visible washes and soft blooms, white paper showing through, loose wet edges",
    "soft pastel": "soft pastel painting, visible chalky strokes, blended tones, textured paper grain",
    "pen and wash": "pen and ink line drawing with loose watercolour washes, confident ink linework, colour sitting inside and outside the lines",
    storybook: "children's storybook illustration, warm and characterful, hand-painted look"
  };

  const STYLE_SUFFIX = "Hand-made artwork. No text, no watermark, no border, no signature. Not a photograph. Not photorealistic. Not 3D rendered. Not digital airbrush. Painted by hand on paper.";

  async function generateImageFromPrompt(
    ai: GoogleGenAI,
    prompt: string
  ): Promise<string> {
    const modelsToTry = [
      "gemini-3.1-flash-lite-image",
      "gemini-3.1-flash-image",
      "gemini-2.5-flash-image"
    ];

    let lastError: any = null;

    for (const mod of modelsToTry) {
      try {
        console.log(`Attempting image generation with model: ${mod}`);
        const res = await ai.models.generateContent({
          model: mod,
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          } as any
        });

        const parts = res.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            const mime = part.inlineData.mimeType || "image/png";
            return `data:${mime};base64,${part.inlineData.data}`;
          }
        }
      } catch (err: any) {
        console.warn(`Image generation failed with model ${mod}:`, err?.message || err);
        lastError = err;
      }
    }

    const errMessage = lastError?.message || "Failed to generate image with Gemini image models.";
    throw new Error(errMessage);
  }

  // ═══════════════════════════════════════════
  // CALL 1 — Variants   POST /api/scene-variants
  // ═══════════════════════════════════════════
  app.post("/api/scene-variants", async (req, res) => {
    try {
      const ai = getAIClient();
      const { idea, style, medium, referenceImageBase64 } = req.body;

      if (!idea && !referenceImageBase64) {
        res.status(400).json({ error: "Either an idea prompt or reference image must be provided" });
        return;
      }

      const activeStyle = style || medium || "watercolour";
      const styleDesc = STYLE_PROMPTS[activeStyle] || STYLE_PROMPTS.watercolour;

      const systemInstruction = `You are a creative art director generating 4 distinct scene takes for a 10-year-old artist.
Return 4 genuinely different compositional takes for the scene idea: "${idea || 'Scene idea'}".
Vary time of day, weather, viewpoint, distance, and mood across the 4 variants.

Per variant:
- id: string
- title: short descriptive title (3-5 words)
- description: vivid 1-2 sentence description of the visual scene, subject, background, lighting
- light: one short sentence describing the light direction or color
- thumbnail_svg: standalone SVG string (viewBox="0 0 280 200") with background rect, key shapes, and colors representing this take

Tone: Simple, warm, plain language. No jargon. No exclamation marks.`;

      const parts: any[] = [];
      if (referenceImageBase64) {
        const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: { mimeType: "image/png", data: cleanBase64 },
        });
      }
      parts.push({ text: `Idea: ${idea || "Scene idea"}. Style: ${activeStyle}. Generate 4 distinct scene takes.` });

      const response = await generateContentWithFallback(ai, {
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variants: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    light: { type: Type.STRING },
                    thumbnail_svg: { type: Type.STRING },
                  },
                  required: ["id", "title", "description", "light", "thumbnail_svg"],
                },
              },
            },
            required: ["variants"],
          },
        },
      });

      const payload = JSON.parse(response.text || "{}");
      const rawVariants = payload.variants || [];

      // Append image prompts and generate real bitmap preview images for each variant
      const variantsWithPrompts = await Promise.all(
        rawVariants.map(async (v: any) => {
          const imagePrompt = `${v.title}. ${v.description}. ${styleDesc}. ${STYLE_SUFFIX}`;
          let image_url = null;
          try {
            image_url = await generateImageFromPrompt(ai, imagePrompt);
          } catch (imgErr) {
            console.warn(`Failed to generate initial image for variant "${v.title}":`, imgErr);
          }
          return {
            ...v,
            pitch: v.description,
            imagePrompt,
            image_url,
          };
        })
      );

      res.json({ success: true, variants: variantsWithPrompts });
    } catch (error: any) {
      console.error("Error generating scene variants:", error);
      const isQuota =
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("quota");
      const message = isQuota
        ? "Gemini API rate limit reached (Quota Exceeded). Please wait ~30-50 seconds and try again."
        : error?.message || "Failed to generate scene variants";
      res.status(isQuota ? 429 : 500).json({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════════
  // CALL 1.5 — Generate Per-Variant Image
  // ═══════════════════════════════════════════
  app.post("/api/generate-variant-image", async (req, res) => {
    try {
      const ai = getAIClient();
      const { prompt, title, style } = req.body;

      if (!prompt) {
        res.status(400).json({ error: "Image prompt is required" });
        return;
      }

      const imageUrl = await generateImageFromPrompt(ai, prompt);
      res.json({ success: true, image: imageUrl });
    } catch (error: any) {
      console.error("Error generating variant image:", error);
      const isQuota = error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("limit: 0");
      const message = isQuota
        ? "Gemini image generation models require a paid API key with billing enabled. Please select your paid API key in AI Studio."
        : error?.message || "Failed to generate image";
      res.status(isQuota ? 429 : 500).json({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════════
  // CALL 1.6 — Generate Line Art Coloring Page Image
  // ═══════════════════════════════════════════
  app.post("/api/generate-coloring-page", async (req, res) => {
    try {
      const ai = getAIClient();
      const { prompt, title } = req.body;

      if (!prompt && !title) {
        res.status(400).json({ error: "Image prompt or title is required" });
        return;
      }

      const lineArtPrompt = `Clean black and white line art coloring page for a painting scene titled "${title || "Art Piece"}". Subject description: ${prompt || title}. Crisp bold black outlines on pure white background. No colors, no grayscale shading, no grey gradients, printable coloring book page style for kids and adults. Uncolored template.`;

      const imageUrl = await generateImageFromPrompt(ai, lineArtPrompt);
      res.json({ success: true, image: imageUrl });
    } catch (error: any) {
      console.error("Error generating coloring page image:", error);
      const isQuota = error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("limit: 0");
      const message = isQuota
        ? "Gemini image generation models require a paid API key with billing enabled. Please select your paid API key in AI Studio."
        : error?.message || "Failed to generate coloring page line art";
      res.status(isQuota ? 429 : 500).json({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════════
  // CALL 2 — Artist brief   POST /api/scene-brief
  // ═══════════════════════════════════════════
  app.post("/api/scene-brief", async (req, res) => {
    try {
      const ai = getAIClient();
      const { variant, style, medium } = req.body;

      if (!variant) {
        res.status(400).json({ error: "Scene variant must be provided" });
        return;
      }

      const activeStyle = style || medium || variant.medium || "watercolour";
      const styleDesc = STYLE_PROMPTS[activeStyle] || STYLE_PROMPTS.watercolour;

      const imagePrompt = variant.imagePrompt || `${variant.title}. ${variant.description || variant.pitch}. ${styleDesc}. ${STYLE_SUFFIX}`;

      // 1. Generate image using Gemini image models
      let highFidImage = variant.image || null;
      if (!highFidImage || highFidImage.length < 500) {
        highFidImage = await generateImageFromPrompt(ai, imagePrompt);
      }

      // 2. Text call for Palette and 1-sentence Light summary
      const systemInstruction = `You are an art assistant for a young 10-year-old artist painting in ${activeStyle}.
Generate:
1. palette: 5-6 color swatches for mixing this scene.
   - hex: hexadecimal color string e.g. "#1e3a8a"
   - color_name: simple color name (e.g. "deep teal", "warm sand", "dusty rose", "moss green", "pale amber"). Do NOT use technical pigment names like "Phthalo Blue".
2. light_note: exactly ONE short sentence describing the key light source or lighting effect in the scene.`;

      const response = await generateContentWithFallback(ai, {
        contents: { parts: [{ text: `Scene: ${variant.title}. Description: ${variant.description || variant.pitch}. Light: ${variant.light}` }] },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              light_note: { type: Type.STRING },
              palette: {
                type: Type.OBJECT,
                properties: {
                  swatches: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        hex: { type: Type.STRING },
                        color_name: { type: Type.STRING },
                      },
                      required: ["hex", "color_name"],
                    },
                  },
                },
                required: ["swatches"],
              },
            },
            required: ["light_note", "palette"],
          },
        },
      });

      const payload = JSON.parse(response.text || "{}");

      const brief = {
        id: `brief-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        variant,
        medium: activeStyle,
        image: highFidImage || variant.image || undefined,
        light_note: payload.light_note || variant.light || "Soft directional light across the scene.",
        palette: payload.palette || {
          swatches: [
            { hex: "#2d3748", color_name: "dark slate" },
            { hex: "#4a5568", color_name: "cool shadow" },
            { hex: "#cbd5e0", color_name: "misty gray" },
            { hex: "#d69e2e", color_name: "warm amber" },
            { hex: "#38a169", color_name: "leaf green" }
          ]
        },
        createdAt: new Date().toISOString(),
        stuck_exchanges: [],
      };

      res.json({ success: true, brief });
    } catch (error: any) {
      console.error("Error generating scene brief:", error);
      const isQuota =
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("quota");
      const message = isQuota
        ? "Gemini API rate limit reached (Quota Exceeded). Please wait ~30-50 seconds and try again."
        : error?.message || "Failed to generate scene brief";
      res.status(isQuota ? 429 : 500).json({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════════
  // CALL 3 — Help when stuck   POST /api/stuck
  // ═══════════════════════════════════════════
  app.post("/api/stuck", async (req, res) => {
    try {
      const ai = getAIClient();
      const { brief, medium, problem, wipImageBase64 } = req.body;

      if (!problem) {
        res.status(400).json({ error: "Problem description is required" });
        return;
      }

      const activeMedium = medium || brief?.medium || 'watercolour';

      const systemInstruction = `You are a working artist consultant diagnosing a painting/drawing issue for an accomplished 10-year-old artist painting on paper in ${activeMedium}.

Input context:
Brief title: "${brief?.variant?.title || 'Painting'}"
Problem described: "${problem}"

Evaluate the issue and output JSON:
- diagnosis: What actually happened and why, in plain technical language. (If a WIP photo is provided, reference specific observable areas of her actual painting).
- recoverable: "yes" | "partly" | "no"
- recovery: Array of concrete ordered steps to fix or work with it. If the passage cannot be recovered, SAY SO PLAINLY and provide the salvage route (working it into the painting or restarting just that area).
- next_time: One sentence on the key decision or preparation that led to this issue.
- keep_going: One honest sentence. Not praise, not reassurance padding. Something true and practical about the work or the technical challenge.

Rules:
- Calm, technical art voice.
- No exclamation marks. No praise padding. No baby talk.`;

      const parts: any[] = [];
      if (wipImageBase64) {
        const cleanBase64 = wipImageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } });
      }
      parts.push({ text: `Painting: ${brief?.variant?.title || 'Artwork'}. Medium: ${activeMedium}. Issue: ${problem}. Diagnose and provide recovery steps.` });

      const response = await generateContentWithFallback(ai, {
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosis: { type: Type.STRING },
              recoverable: { type: Type.STRING, enum: ["yes", "partly", "no"] },
              recovery: { type: Type.ARRAY, items: { type: Type.STRING } },
              next_time: { type: Type.STRING },
              keep_going: { type: Type.STRING },
            },
            required: ["diagnosis", "recoverable", "recovery", "next_time", "keep_going"],
          },
        },
      });

      const payload = JSON.parse(response.text || "{}");
      res.json({ success: true, ...payload });
    } catch (error: any) {
      console.error("Error diagnosing stuck problem:", error);
      const isQuota =
        error?.status === 429 ||
        error?.message?.includes("429") ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("quota");
      const message = isQuota
        ? "Gemini API rate limit reached (Quota Exceeded). Please wait ~30-50 seconds and try again."
        : error?.message || "Failed to diagnose stuck issue";
      res.status(isQuota ? 429 : 500).json({ success: false, error: message });
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
    console.log(`Reconstructive Scene Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
