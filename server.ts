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

  // ═══════════════════════════════════════════
  // CALL 1 — Variants   POST /api/scene-variants
  // ═══════════════════════════════════════════
  app.post("/api/scene-variants", async (req, res) => {
    try {
      const ai = getAIClient();
      const { idea, medium, referenceImageBase64 } = req.body;

      if (!idea && !referenceImageBase64) {
        res.status(400).json({ error: "Either an idea prompt or reference image must be provided" });
        return;
      }

      const systemInstruction = `You are a professional art instructor for a 10-year-old artist painting in ${medium || 'watercolour or soft pastel'}.
Subject scope: Scenes are CHARACTER-IN-ENVIRONMENT (a creature/figure as focal subject inside a fully realized setting with background/midground/foreground separation and directional light).

Return 3 to 4 composition variants that interpret the idea GENUINELY DIFFERENTLY — vary framing, time of day, weather, viewpoint, and mood.

Per variant:
- title: concise descriptive title
- pitch: exactly two sentences on what makes this version interesting
- framing: e.g. "wide vista, low horizon", "close crop, looking up", "framed vignette"
- light: e.g. "late afternoon backlight through mist"
- mood: three adjectives e.g. "solitary, serene, ancient"
- difficulty: "approachable" | "a stretch" | "ambitious"
- thumbnail_svg: loose compositional thumbnail, 280x200 viewBox. Big simple value shapes only. Three fill tones showing depth planes: light background (#e2e8f0), mid midground (#94a3b8), dark foreground (#334155). Include focal subject silhouette shape. Do NOT use complex tiny lines.

Rules:
- Calm, technical art voice.
- No exclamation marks. No "let's", no "cute/happy/friendly".
- Output JSON with array "variants".`;

      const parts: any[] = [];
      if (referenceImageBase64) {
        const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: { mimeType: "image/png", data: cleanBase64 },
        });
      }
      parts.push({ text: `Idea: ${idea || "Character in environment scene"}. Medium: ${medium || "either"}. Generate 3-4 distinct compositional variants.` });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
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
                    pitch: { type: Type.STRING },
                    framing: { type: Type.STRING },
                    light: { type: Type.STRING },
                    mood: { type: Type.STRING },
                    difficulty: { type: Type.STRING, enum: ["approachable", "a stretch", "ambitious"] },
                    thumbnail_svg: { type: Type.STRING },
                  },
                  required: ["id", "title", "pitch", "framing", "light", "mood", "difficulty", "thumbnail_svg"],
                },
              },
            },
            required: ["variants"],
          },
        },
      });

      const payload = JSON.parse(response.text || "{}");
      res.json({ success: true, variants: payload.variants || [] });
    } catch (error: any) {
      console.error("Error generating scene variants:", error);
      res.status(500).json({ success: false, error: error?.message || "Failed to generate scene variants" });
    }
  });

  // ═══════════════════════════════════════════
  // CALL 2 — Artist brief   POST /api/scene-brief
  // ═══════════════════════════════════════════
  app.post("/api/scene-brief", async (req, res) => {
    try {
      const ai = getAIClient();
      const { variant, medium, referenceImageBase64 } = req.body;

      if (!variant) {
        res.status(400).json({ error: "Scene variant must be provided" });
        return;
      }

      const activeMedium = medium || variant.medium || 'watercolour';

      const systemInstruction = `You are an expert art instructor providing an ARTIST BRIEF for a 10-year-old artist painting in ${activeMedium} on paper.

Input: Chosen composition variant: "${variant.title}" (${variant.pitch}, Light: ${variant.light}, Framing: ${variant.framing}, Mood: ${variant.mood}).

Generate a full Artist Brief payload:

1. layout_plan: MUST open with an explicit parts checklist for the subject (e.g. "Checklist: head, torso, left wing, right wing (mirrored), tail, background oak branch, foreground ferns"). Every part named must appear in at least one step.

2. composition_guide: 4 to 6 steps maximum on 500x500 viewBox (bounds 40..460).
   - Structure and proportion scaffolding only. Do NOT instruct on small details.
   - Each step has: step_number, instruction (concise technical directive without exclamation marks), svg_code (bare SVG elements), layer ("construction" | "outline" | "detail").
   - Layer rules:
     - Steps 1-2 MUST be layer "construction" (block-in, axis lines).
     - Middle steps MUST be layer "outline" (main contour, silhouetting).
     - The FINAL step MUST ALWAYS be layer "detail" (focal accents, structural highlights).
   - Symmetry rule: For bilaterally symmetric features (wings, ears, limbs, eyes), derive the second side by mirroring around the center axis given in layout_plan.

3. value_plan: Three 280x200 viewBox SVG thumbnails in greyscale (#111827 to #f9fafb fills):
   - three_values: light, mid, dark shape blocks.
   - five_values: expanded 5-value hierarchy.
   - light_source_structure: final value map with light direction indicator mark (<path d="..." fill="#fef08a"/> or similar sun arrow/glow).
   - eye_focus_note: one sentence on where the eye should land first and why.

4. palette: 5-7 swatches.
   - Each swatch: hex, pigment_name (pigment-style like "Raw Umber", "French Ultramarine", "Yellow Ochre", "Viridian", "Payne's Grey"), role in picture, depth_plane ("background" | "midground" | "foreground").
   - rationale: two sentences on why this palette suits the stated mood (${variant.mood}). Muted and natural colors.

5. technique_notes: 4-6 MEDIUM-SPECIFIC technical directives for ${activeMedium}.
   ${activeMedium === 'watercolour'
     ? 'Address order of washes, reserved white paper BEFORE starting, wet-on-wet vs wet-on-dry areas, granulation/blooms, dry time dependencies, final touches.'
     : 'Address paper tone choice, dark-to-light vs light-to-dark layering, finger/stump blending vs unblended strokes, side vs edge of stick, fixative timing.'}

6. texture_notes: 4-6 material-specific texture guidance sentences for materials in this picture (e.g. water, foliage, bark, stone, scales, fur).

7. watch_points: 3-5 stage/risk/prevention items for THIS picture in ${activeMedium}.
   - Each item: stage (when in process), risk (what goes wrong), prevention (what to do instead).
   - Cover irreversible decisions (reserved whites, first darks, paper tooth, over-blending).

Tone: Calm, professional, technical art-instructor. No exclamation marks. No "let's", no "cute/happy/friendly".`;

      const parts: any[] = [];
      if (referenceImageBase64) {
        const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } });
      }
      parts.push({ text: `Chosen Variant: ${JSON.stringify(variant)}. Medium: ${activeMedium}. Generate full artist brief.` });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              layout_plan: { type: Type.STRING },
              composition_guide: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    step_number: { type: Type.INTEGER },
                    instruction: { type: Type.STRING },
                    svg_code: { type: Type.STRING },
                    layer: { type: Type.STRING, enum: ["construction", "outline", "detail"] },
                  },
                  required: ["step_number", "instruction", "svg_code", "layer"],
                },
              },
              value_plan: {
                type: Type.OBJECT,
                properties: {
                  thumbnails: {
                    type: Type.OBJECT,
                    properties: {
                      three_values: { type: Type.STRING },
                      five_values: { type: Type.STRING },
                      light_source_structure: { type: Type.STRING },
                    },
                    required: ["three_values", "five_values", "light_source_structure"],
                  },
                  eye_focus_note: { type: Type.STRING },
                },
                required: ["thumbnails", "eye_focus_note"],
              },
              palette: {
                type: Type.OBJECT,
                properties: {
                  swatches: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        hex: { type: Type.STRING },
                        pigment_name: { type: Type.STRING },
                        role: { type: Type.STRING },
                        depth_plane: { type: Type.STRING, enum: ["background", "midground", "foreground"] },
                      },
                      required: ["hex", "pigment_name", "role", "depth_plane"],
                    },
                  },
                  rationale: { type: Type.STRING },
                },
                required: ["swatches", "rationale"],
              },
              technique_notes: { type: Type.ARRAY, items: { type: Type.STRING } },
              texture_notes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    material: { type: Type.STRING },
                    instruction: { type: Type.STRING },
                  },
                  required: ["material", "instruction"],
                },
              },
              watch_points: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stage: { type: Type.STRING },
                    risk: { type: Type.STRING },
                    prevention: { type: Type.STRING },
                  },
                  required: ["stage", "risk", "prevention"],
                },
              },
            },
            required: ["layout_plan", "composition_guide", "value_plan", "palette", "technique_notes", "texture_notes", "watch_points"],
          },
        },
      });

      const payload = JSON.parse(response.text || "{}");

      // Bug Fix 3 Validation: Ensure final step is layer "detail"
      if (payload.composition_guide && payload.composition_guide.length > 0) {
        const lastIndex = payload.composition_guide.length - 1;
        if (payload.composition_guide[lastIndex].layer !== "detail") {
          console.warn(`[Server Validation Warning] Final step layer was "${payload.composition_guide[lastIndex].layer}". Correcting to "detail".`);
          payload.composition_guide[lastIndex].layer = "detail";
        }
      }

      const brief = {
        id: `brief-${Date.now()}`,
        variant,
        medium: activeMedium,
        layout_plan: payload.layout_plan,
        composition_guide: payload.composition_guide || [],
        value_plan: payload.value_plan,
        palette: payload.palette,
        technique_notes: payload.technique_notes || [],
        texture_notes: payload.texture_notes || [],
        watch_points: payload.watch_points || [],
        createdAt: new Date().toISOString(),
        stuck_exchanges: [],
      };

      res.json({ success: true, brief });
    } catch (error: any) {
      console.error("Error generating scene brief:", error);
      res.status(500).json({ success: false, error: error?.message || "Failed to generate scene brief" });
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

      const systemInstruction = `You are a working artist consultant diagnosing a painting issue for a 10-year-old artist painting on paper in ${medium || 'watercolour or soft pastel'}.

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
      parts.push({ text: `Painting: ${brief?.variant?.title || 'Artwork'}. Medium: ${medium}. Issue: ${problem}. Diagnose and provide recovery steps.` });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
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
      res.status(500).json({ success: false, error: error?.message || "Failed to diagnose stuck issue" });
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
