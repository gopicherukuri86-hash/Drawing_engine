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

      const activeMedium = medium || "watercolour";

      const systemInstruction = `You are a professional art instructor for an accomplished 10-year-old artist painting/drawing in ${activeMedium}.
Subject scope: Scenes are CHARACTER-IN-ENVIRONMENT (a creature, figure, building, boat, or focal structure inside a fully realized setting with background/midground/foreground separation and directional light).

Return 3 to 4 composition variants that interpret the idea GENUINELY DIFFERENTLY — vary framing, time of day, weather, viewpoint, and mood.

Per variant:
- title: concise descriptive title
- pitch: exactly two sentences on what makes this version interesting
- framing: e.g. "wide vista, low horizon", "close crop, looking up", "framed vignette"
- light: e.g. "late afternoon backlight through mist"
- mood: three adjectives e.g. "solitary, serene, ancient"
- difficulty: "approachable" | "a stretch" | "ambitious"
- thumbnail_svg: loose compositional thumbnail, 280x200 viewBox. Big simple value shapes only. Three fill tones showing depth planes: light background (#e2e8f0), mid midground (#94a3b8), dark foreground (#334155). Include focal subject silhouette shape. Do NOT use complex tiny lines.

Calibrate difficulty against an artist who already handles: emitted light on a dark ground, linear and atmospheric perspective in the same picture, sustained pattern work across a large area, complementary colour schemes, reserved highlights, and architectural subjects in line and wash.
"approachable" — a comfortable evening's work for her.
"a stretch" — one element she has done before, pushed further.
"ambitious" — a technique she has not attempted yet: reflections in moving water, wet fabric, night rain, figures in motion, glass, polished metal, backlit translucency.
At least one variant in every response must be "ambitious". Do not soften subjects to make them easier.

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
      parts.push({ text: `Idea: ${idea || "Character in environment scene"}. Medium: ${activeMedium}. Generate 3-4 distinct compositional variants.` });

      const response = await generateContentWithFallback(ai, {
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

      const systemInstruction = `You are an expert art instructor providing an ARTIST BRIEF for a skilled 10-year-old artist executing a painting/drawing in ${activeMedium} on paper.

Input: Chosen composition variant: "${variant.title}" (${variant.pitch}, Light: ${variant.light}, Framing: ${variant.framing}, Mood: ${variant.mood}).

Generate a full Artist Brief payload:

1. composition_guide: Planning aid comparing 2 to 3 layout options for this scene.
   - layouts: Array of 2 to 3 layout alternatives of the chosen scene on 280x200 viewBox (major masses, value blocks, focal point marker, and main directional lines only).
     - thumbnail_svg: clean SVG code 280x200 viewBox showing simple shape blocks for major masses and directional guide lines/focal mark.
     - label: short name for the arrangement (e.g. "low horizon, subject right", "diagonal perspective, off-center focal point").
     - note: one sentence on what this arrangement emphasizes.
   - focal_point: string describing the precise visual center of interest and how framing leads to it.
   - eye_path: string describing how the eye enters and travels through the directional lines/masses.
   - rationale: one paragraph on why the primary layout works best and what the alternatives would cost or gain.

2. value_plan: Three 280x200 viewBox SVG thumbnails in greyscale (#111827 to #f9fafb fills):
   - three_values: light, mid, dark shape blocks.
   - five_values: expanded 5-value hierarchy.
   - light_source_structure: final value map with light direction indicator mark (<path d="..." fill="#fef08a"/> or similar sun arrow/glow).
   - eye_focus_note: one sentence on where the eye should land first and why.

3. palette: 5-7 swatches.
   - Each swatch: hex, pigment_name (pigment-style like "Raw Umber", "French Ultramarine", "Yellow Ochre", "Viridian", "Payne's Grey"), role in picture, depth_plane ("background" | "midground" | "foreground").
   - rationale: two sentences on why this palette suits the stated mood (${variant.mood}). Muted and natural colors.

4. technique_notes: 4-6 MEDIUM-SPECIFIC technical directives for ${activeMedium}.
   ${activeMedium === 'pen and wash'
     ? 'Address: 1) whether ink goes down before or after the washes and why for this particular subject; 2) where to leave line out entirely and let the wash carry the form; 3) line weight variation across depth planes; 4) how much detail the pen should carry versus the paint; 5) waterproof versus soluble ink for the desired effect.'
     : activeMedium === 'mixed'
     ? 'Address which two media are being combined for this scene and address the interaction between them (e.g. layering order, resist effects, paper tooth constraints, drying/fixation).'
     : activeMedium === 'watercolour'
     ? 'Address order of washes, reserved white paper BEFORE starting, wet-on-wet vs wet-on-dry areas, granulation/blooms, dry time dependencies, final touches.'
     : 'Address paper tone choice, dark-to-light vs light-to-dark layering, finger/stump blending vs unblended strokes, side vs edge of stick, fixative timing.'}

5. texture_notes: 4-6 material-specific texture guidance sentences for materials in this picture (e.g. water, foliage, bark, stone, scales, fur).

6. watch_points: 3-5 stage/risk/prevention items for THIS picture in ${activeMedium}.
   - Each item: stage (when in process), risk (what goes wrong), prevention (what to do instead).
   - Cover irreversible decisions (reserved whites, first darks, paper tooth, over-blending, permanent ink lines).

7. edge_notes: 3-4 items. Where edges should be hard, soft, or lost in this picture and what that does to the depth reading. Name the specific area each note refers to.

8. colour_temperature: 2-3 sentences on the warm/cool structure of the scene — which plane is warm, which is cool, and where the temperature flips. Tie it to the light described in the variant.

Tone: Calm, professional, technical art-instructor. No exclamation marks. No "let's", no "cute/happy/friendly".`;

      const parts: any[] = [];
      if (referenceImageBase64) {
        const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } });
      }
      parts.push({ text: `Chosen Variant: ${JSON.stringify(variant)}. Medium: ${activeMedium}. Generate full artist brief.` });

      const response = await generateContentWithFallback(ai, {
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              composition_guide: {
                type: Type.OBJECT,
                properties: {
                  layouts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        thumbnail_svg: { type: Type.STRING },
                        label: { type: Type.STRING },
                        note: { type: Type.STRING },
                      },
                      required: ["thumbnail_svg", "label", "note"],
                    },
                  },
                  focal_point: { type: Type.STRING },
                  eye_path: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: ["layouts", "focal_point", "eye_path", "rationale"],
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
              edge_notes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    area: { type: Type.STRING },
                    treatment: { type: Type.STRING, enum: ["hard", "soft", "lost"] },
                    reason: { type: Type.STRING },
                  },
                  required: ["area", "treatment", "reason"],
                },
              },
              colour_temperature: { type: Type.STRING },
            },
            required: ["composition_guide", "value_plan", "palette", "technique_notes", "texture_notes", "watch_points", "edge_notes", "colour_temperature"],
          },
        },
      });

      const payload = JSON.parse(response.text || "{}");

      const brief = {
        id: `brief-${Date.now()}`,
        variant,
        medium: activeMedium,
        composition_guide: payload.composition_guide,
        value_plan: payload.value_plan,
        palette: payload.palette,
        technique_notes: payload.technique_notes || [],
        texture_notes: payload.texture_notes || [],
        watch_points: payload.watch_points || [],
        edge_notes: payload.edge_notes || [],
        colour_temperature: payload.colour_temperature || "",
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
