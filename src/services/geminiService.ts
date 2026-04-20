import { GoogleGenAI, ThinkingLevel, Type, FunctionDeclaration } from "@google/genai";
import { getComponentDatabaseSummary, getTemplateSummary, DESIGN_PRACTICES, COMMUNITY_SOURCES } from '../designDatabase';
import { getStyleDirective, get3DStyleDirective, getSketchStyleDirective, type DesignStyle } from '../styleGuides';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.httpStatusCode ?? err?.code;
      const retryable = status === 503 || status === 429 || status === 500;
      if (!retryable || attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error("Retry exhausted");
}

const SAVE_PRESET_TOOL: FunctionDeclaration = {
  name: "save_material_preset",
  description: "Saves a new material preset with specific laser settings (power, speed, passes, mode). Use this when the user wants to save or remember settings for a material.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "The name of the material (e.g., 'Maple Wood', 'Black Acrylic')."
      },
      power: {
        type: Type.NUMBER,
        description: "Power percentage (0-100)."
      },
      speed: {
        type: Type.NUMBER,
        description: "Speed in mm/min."
      },
      passes: {
        type: Type.NUMBER,
        description: "Number of passes (usually 1-5)."
      },
      mode: {
        type: Type.STRING,
        description: "Laser mode: 'M3' (Constant Power) or 'M4' (Dynamic Power).",
        enum: ["M3", "M4"]
      }
    },
    required: ["name", "power", "speed", "passes", "mode"]
  }
};

const GENERATE_BLUEPRINT_TOOL: FunctionDeclaration = {
  name: "generate_blueprint",
  description: "Triggers full prototype blueprint generation. Use this when the user has described a sufficient project idea and is ready to build, or says things like 'let's build it', 'design this', 'make it', etc.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      projectDescription: {
        type: Type.STRING,
        description: "Comprehensive summary of the project including all discussed features, components, requirements, and design decisions from the conversation."
      },
      fabricationPreference: {
        type: Type.STRING,
        description: "Primary fabrication approach",
        enum: ["3d_print", "laser_cut", "mixed"]
      }
    },
    required: ["projectDescription"]
  }
};

export async function generateLaserDesign(prompt: string, style: string = "minimalist", aspectRatio: string = "1:1", referenceImage?: string) {
  const styleDirective = getStyleDirective(style as DesignStyle);
  const parts: any[] = [];
  if (referenceImage) {
    parts.push({ inlineData: { data: referenceImage.split(',')[1], mimeType: 'image/png' } });
    parts.push({ text: 'Use the provided reference image as inspiration for the design. Match its proportions and overall form, but adapt it to laser engraving style.\n\n' });
  }
  parts.push({ text: `Generate a high-contrast, black and white stencil suitable for laser engraving of: ${prompt}.

${styleDirective}

The output must be clearly reproducible on wood or metal via laser engraving. Produce a single centered design with no text labels unless the user asked for text.` });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function analyzeLaserMaterial(imageBase64: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        { inlineData: { data: imageBase64.split(',')[1], mimeType: "image/png" } },
        { text: "Identify the material in this image. Assess its suitability for prototyping — including 3D printing, laser engraving, and CNC. For laser engraving, suggest optimal power (0-100%) and speed (mm/min) settings for an ACMER S1 2.5W diode laser and whether it needs masking tape. Also suggest other fabrication methods that could work with this material." }
      ]
    }
  });
  return response.text;
}

export async function getSmartSettings(material: string, manualContent: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Based on the following laser manual content: \n\n${manualContent}\n\n What are the recommended settings for ${material}? Provide power, speed, and passes.`
  });
  return response.text;
}

const ADVISOR_SYSTEM_INSTRUCTION = `You are a world-class rapid prototyping expert and engineering advisor for SUBSTRATA by GANTASMO.
You have deep expertise across the entire prototyping pipeline: ideation, design, materials, fabrication (3D printing, laser engraving/cutting, CNC), electronics, mechanical engineering, and finishing.
You are also a specialist on the ACMER S1 laser engraver for the laser fabrication step.

YOUR DESIGN THINKING PROCESS:
When a user describes a project idea (even vague ones like "LED doorknob" or "hexapod robot"), you should:
1. DECOMPOSE: Break it into subsystems (structural, mechanical, electrical, software)
2. SPECIFY: Recommend specific components with real part numbers from your knowledge
3. FABRICATION: Decide what needs to be 3D printed vs laser cut vs bought off-shelf
4. REFERENCE: Suggest community designs on GitHub, Thingiverse, Instructables, Hackaday
5. BUILD: When the user is ready, use the 'generate_blueprint' tool to trigger full blueprint generation

NOVEL SOLUTION STRATEGIES — proactively suggest these approaches when relevant:

- REFERENCE-AND-EXTRUDE: "Find a reference image of an existing part, then extrude its silhouette as a starting geometry." This is ideal when the user needs a part shaped like something that already exists (e.g., a bracket, knob, or housing). Suggest they upload a photo of the reference object and use the Sketch panel's Extrude-to-3D feature to create baseline geometry from the image outline.

- HYBRID FABRICATION: Combine 3D printing + laser cutting + off-shelf. For example: laser-cut the flat structural panels from plywood for rigidity, 3D print the complex joints/brackets, and use hardware store fasteners for assembly. Always consider which fabrication method is strongest/cheapest/fastest for each part.

- REVERSE ENGINEER APPROACH: When a user shows a product they want to replicate, suggest analyzing the reference image to identify individual subcomponents, materials, and joints first before designing. Break the reference into "what can be 3D printed," "what should be laser cut," and "what needs to be bought."

- PARAMETRIC VARIANT STRATEGY: Instead of designing a single part, suggest creating parametric OpenSCAD modules where key dimensions are variables. This lets the user quickly iterate on sizes, hole patterns, wall thickness, etc. Recommend this for any part that might need fine-tuning.

- MATERIAL-FIRST DESIGN: Suggest starting from available materials and working backward. "What materials do you have on hand?" can dramatically simplify a project. A design that uses a standard aluminum extrusion frame + 3D printed brackets is cheaper and faster than full custom.

- SKETCH-BEFORE-BUILD: Encourage users to generate a concept sketch (rough ideation → refined concept → technical drawing) before committing to a full blueprint. The sketch can reveal proportion issues, missing features, or better approaches early.

${getComponentDatabaseSummary()}

${DESIGN_PRACTICES}

COMMUNITY SOURCES:
${COMMUNITY_SOURCES.map(s => `- ${s.platform}: ${s.categories.join(', ')}`).join('\n')}

RULES:
1. Be brief but information-dense. Use bullet points and specs.
2. ALWAYS end your response with a clear next-step suggestion (unless confirming a tool call).
3. If the user wants to save laser settings, trigger 'save_material_preset'.
4. When the user is ready to build (says "let's build it", "design this", "make it", etc.), trigger 'generate_blueprint' with a comprehensive project description summarizing the entire conversation.
5. Proactively reference similar community projects and suggest searching for them.
6. When recommending components, use specific part names and approximate prices.
7. Think about what goes into the project systematically: What are ALL the subsystems? What interfaces between them?
8. Proactively suggest novel strategies from the list above when they fit the user's project.
9. When the user seems stuck, suggest using the Sketch panel to visualize ideas before engineering them.`;

export async function consultLaserExpert(query: string, history: any[] = [], useThinking: boolean = false) {
  const modelName = useThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  
  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: [
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: query }] }
    ],
    config: {
      systemInstruction: ADVISOR_SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [SAVE_PRESET_TOOL, GENERATE_BLUEPRINT_TOOL], googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
      thinkingConfig: useThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
    }
  }));

  return {
    text: response.text || "",
    calls: response.functionCalls || []
  };
}

export async function complexThinkingTask(query: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: query,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return response.text;
}

export async function searchCommunityModels(query: string): Promise<string> {
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Search for 3D models, laser cut files, and maker community projects related to: "${query}"

Find specific results from these platforms: Thingiverse, Printables, GrabCAD, GitHub, Instructables, Hackaday, MyMiniFactory, Cults3D.

For each result, provide:
- **Title** and platform
- **Direct URL** to the project
- **Brief description** of what it is
- **Relevance** note on how it could be used as a reference or starting point

Return the top 5-8 most relevant results. Format as a clean markdown list.`,
    config: {
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true }
    }
  }));
  return response.text || 'No results found.';
}

export async function synthesizeImageEdition(
    mode: 'inpaint' | 'outpaint' | 'generate' | 'style', 
    prompt: string, 
    imageBase64?: string, 
    maskBase64?: string
) {
    const model = "gemini-3.1-flash-image-preview";
    
    let systemInstruction = "";
    if (mode === 'inpaint') {
        systemInstruction = "You are an expert image inpainter. Modify the original image only in the masked area according to the prompt.";
    } else if (mode === 'outpaint') {
        systemInstruction = "You are an expert image outpainter. Extend the edges of the image seamlessly to fill the canvas according to the prompt.";
    } else if (mode === 'style') {
        systemInstruction = "You are a style transfer expert. Redraw the entire image in the specific style requested by the user, maintaining the original composition.";
    }

    const parts: any[] = [];
    if (imageBase64) {
        parts.push({ inlineData: { data: imageBase64.split(',')[1], mimeType: "image/png" } });
    }
    if (maskBase64) {
        parts.push({ inlineData: { data: maskBase64.split(',')[1], mimeType: "image/png" } });
    }
    parts.push({ text: `${mode.toUpperCase()}: ${prompt}` });

    const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
            systemInstruction,
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K"
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
}

export async function transcribeSpokenPrompt(audioBase64: string) {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
            parts: [
                { inlineData: { data: audioBase64, mimeType: "audio/wav" } },
                { text: "Transcribe this audio prompt for a design or prototyping project." }
            ]
        }
    });
    return response.text;
}

// ── Enhanced Blueprint Generation ─────────────────────────────
// Generates full prototype blueprints with actual design files

export async function generateProjectBlueprint(
  prompt: string,
  designStyle: string,
  printer: string,
  advisorContext: string = '',
  referenceImage?: string
) {
  const componentDb = getComponentDatabaseSummary();
  const templateDb = getTemplateSummary();

  const systemPrompt = `You are an expert industrial designer, mechanical engineer, and electronics architect at GANTASMO.
You ACTUALLY design parts — not just list them. You think through every subsystem, every interface, every fastener.

${componentDb}

${DESIGN_PRACTICES}

DESIGN TEMPLATES REFERENCE:
${templateDb}

When generating a blueprint:
1. DECOMPOSE the project into clear subsystems
2. For each 3D printed part, generate working OpenSCAD code that produces the actual geometry
3. For each laser-cut part, generate a SEPARATE SVG drawing with real dimensions, separated by <!--PART_BREAK-->. Each SVG must have a <title> element with the part name.
4. For electronics, generate a Mermaid flowchart (graph LR or graph TD) showing every wiring connection between components, followed by ---TEXT--- and a text pin-by-pin listing
5. Use REAL component names and part numbers from the database above
6. Generate REAL firmware/control code (Arduino/MicroPython) that compiles
7. Provide step-by-step assembly instructions
8. Consider tolerances, interference fits, and DFM rules
`;

  const contextSection = advisorContext 
    ? `\n\nCONTEXT FROM DESIGN ADVISOR SESSION:\n${advisorContext}\n` 
    : '';

  const textContent = `${systemPrompt}

PROJECT REQUEST: ${prompt}
${contextSection}
Configured Printer: ${printer}
Design Style: ${designStyle}

Generate a complete, actionable prototype blueprint. Every part should be designed, not just named.

${get3DStyleDirective(designStyle as DesignStyle)}

Return exactly as JSON.`;

  const contentParts: any[] = [];
  if (referenceImage) {
    contentParts.push({ inlineData: { data: referenceImage.split(',')[1], mimeType: 'image/png' } });
    contentParts.push({ text: 'REFERENCE IMAGE: Use this as a visual guide for proportions, form factor, and overall shape. The design should closely match the reference.\n\n' });
  }
  contentParts.push({ text: textContent });

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          designNotes: { type: Type.STRING, description: "Detailed design rationale, tradeoffs, and key decisions" },
          parts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                source: { type: Type.STRING },
                price: { type: Type.NUMBER },
                speed: { type: Type.STRING, description: "Delivery: Today, Tomorrow, 2-3 Days, 1-Week" },
                category: { type: Type.STRING, description: "One of: Structural, Actuator, Electronics, Sensor, Hardware, Power" },
                specs: { type: Type.STRING },
                url: { type: Type.STRING },
                fabrication: { type: Type.STRING, description: "One of: 3d_print, laser_cut, off_shelf" }
              },
              required: ["name", "source", "price", "speed", "category"]
            }
          },
          openscadCode: { type: Type.STRING, description: "Complete OpenSCAD code for ALL 3D-printable custom parts. Each part as a module with translate(), rotate(), cube(), cylinder(), sphere() calls using NAMED PARAMETERS (e.g. cube([w,d,h]), cylinder(r=5, h=10), sphere(r=3)). Use varied shapes, rounded edges (cylinder for fillets), and realistic proportions. Include an assembly() module that positions all parts together. Use difference() for holes and cutouts. CRITICAL: every module MUST contain at least one primitive (cube/cylinder/sphere) with explicit numeric dimensions." },
          svgDesign: { type: Type.STRING, description: "Generate MULTIPLE SVG drawings separated by <!--PART_BREAK--> comments. Each part SVG should be a complete <svg> element with viewBox, containing the 2D profile/cutline for ONE part. Include a <title> element with the part name. Use <rect>, <circle>, <path>, <line> elements with real dimensions in mm. Use stroke='red' for cut lines, stroke='blue' for engrave lines. Example: <svg viewBox='0 0 100 50'><title>Base Plate</title>...</svg><!--PART_BREAK--><svg viewBox='0 0 60 60'><title>Side Panel</title>...</svg>" },
          wiringDiagram: { type: Type.STRING, description: "Generate a Mermaid flowchart diagram showing ALL wiring connections. Use 'graph LR' or 'graph TD'. Each component is a node, each wire is an edge with the pin names as labels. Example: graph LR; Arduino[Arduino Uno] -->|D9 PWM| MotorDriver[L298N]; MotorDriver -->|OUT1/OUT2| Motor[Nema 17]; PSU[12V PSU] -->|VIN| MotorDriver; PSU -->|5V reg| Arduino; Also include a text summary after the mermaid block preceded by '---TEXT---' showing pin-by-pin connections." },
          assemblySteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          code: { type: Type.STRING, description: "Complete, compilable Arduino/MicroPython firmware for the project" },
          printingFiles: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }
          },
          communityRefs: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "URLs or search terms for similar projects on GitHub, Thingiverse, Instructables, Hackaday"
          }
        },
        required: ["name", "description", "parts", "code", "printingFiles", "openscadCode", "assemblySteps"]
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  }));

  return JSON.parse(response.text);
}

// ── Parametric Variant Generation ─────────────────────────────

export async function generateParametricVariant(
  existingCode: string,
  variantRequest: string,
  designStyle: string
): Promise<{ code: string; description: string; parameters: Record<string, number> }> {
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are an OpenSCAD expert. Given existing OpenSCAD code, generate a parametric variant.

EXISTING CODE:
\`\`\`openscad
${existingCode}
\`\`\`

VARIANT REQUEST: ${variantRequest}

RULES:
1. Extract hardcoded dimensions into named parameters at the top of the file
2. Apply the requested variation by changing parameter values
3. Keep the same structure but make it fully parametric
4. Add clear comments explaining each parameter
5. The result must be valid, compilable OpenSCAD

${get3DStyleDirective(designStyle as DesignStyle)}

Return as JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: "Complete parametric OpenSCAD code" },
          description: { type: Type.STRING, description: "What changed and why" },
          parameters: {
            type: Type.OBJECT,
            additionalProperties: true,
            description: "Key parameter names and their values"
          }
        },
        required: ["code", "description"]
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  }));

  return JSON.parse(response.text);
}

// ── Concept Sketch Generation ─────────────────────────────────
// Generates concept drawings at different fidelity levels

export type SketchMode = 'rough' | 'refined' | 'technical' | 'presentation';

const SKETCH_MODE_PROMPTS: Record<SketchMode, string> = {
  rough: `Generate a ROUGH IDEATION SKETCH — loose, gestural pencil lines like a designer's first napkin sketch.
Show 2-3 quick variations/angles of the concept on one canvas. Emphasis on proportions and large forms, not detail.
Use light construction lines, quick hatching for shadow side only. The sketch should look fast and energetic — 
like an industrial designer brainstorming with a soft pencil on tracing paper. Include small annotation arrows 
pointing to key features with brief handwritten-style labels.`,

  refined: `Generate a REFINED CONCEPT DRAWING — a clean, single-view line drawing of the design.
Use consistent line weight with slightly heavier outlines for the main silhouette. Light parallel-line shading 
on shadow surfaces to show 3D form. Include dimension callouts for key measurements and brief material labels.
The drawing should look like a polished concept from a design studio — confident lines, deliberate composition,
with a small 3/4 perspective view in the corner. White background. Professional but still hand-drawn feel.`,

  technical: `Generate a TECHNICAL ENGINEERING SKETCH — precise and detailed like a patent drawing or shop drawing.
Show an exploded or section view with hatching for cut surfaces. Include dimension lines with exact measurements,
material callouts, part numbers, and assembly notes. Use varied line weight: thick for outlines, medium for 
visible edges, thin for hidden edges (dashed), thinnest for dimension/leader lines. Add a title block area with
scale reference. The drawing should be clear enough to manufacture from.`,

  presentation: `Generate a PRESENTATION RENDER SKETCH — a polished marker/digital rendering suitable for a design portfolio.
Show the product in a natural/lifestyle context with a ground shadow and subtle environment reflections.
Use smooth gradients, highlight streaks on glossy surfaces, and dramatic lighting (top-left light source).
Rich tonal range from deep blacks to bright white highlights. Include a subtle background gradient or surface.
The rendering should sell the design — it should look desirable, professional, and production-ready.`
};

export async function generateConceptSketch(
  prompt: string,
  style: string = 'minimalist',
  sketchMode: SketchMode = 'refined',
  referenceImage?: string
): Promise<string | null> {
  const sketchStyleDirective = getSketchStyleDirective(style as DesignStyle);
  const modePrompt = SKETCH_MODE_PROMPTS[sketchMode];

  const parts: any[] = [];
  if (referenceImage) {
    parts.push({ inlineData: { data: referenceImage.split(',')[1], mimeType: 'image/png' } });
    parts.push({ text: `Use the provided reference image as a visual guide for proportions and form. Reinterpret it in the sketch style described below.\n\n` });
  }
  parts.push({ text: `SUBJECT: ${prompt}\n\n${modePrompt}\n\n${sketchStyleDirective}\n\nProduce one high-quality concept sketch image. No photo-realism — this must look hand-drawn/sketched.` });

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: '1K'
      }
    }
  }));

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateConceptSheet(
  prompt: string,
  style: string = 'minimalist',
  referenceImage?: string
): Promise<string | null> {
  const sketchStyleDirective = getSketchStyleDirective(style as DesignStyle);

  const parts: any[] = [];
  if (referenceImage) {
    parts.push({ inlineData: { data: referenceImage.split(',')[1], mimeType: 'image/png' } });
    parts.push({ text: `Use the provided reference image as a visual guide for the design.\n\n` });
  }
  parts.push({ text: `Generate a CONCEPT DESIGN SHEET for: ${prompt}

Show FOUR views arranged in a 2x2 grid on a single white canvas:
- TOP LEFT: 3/4 perspective view (hero shot, largest, most detailed)
- TOP RIGHT: Front elevation (straight-on, orthographic)
- BOTTOM LEFT: Side profile (orthographic, showing depth/height)
- BOTTOM RIGHT: Detail callout (zoomed feature of the most interesting/novel mechanism or joint)

Each view should have a small label. Include construction lines and annotations.

${sketchStyleDirective}

This must look like a professional industrial design concept sheet — hand-drawn quality, not CAD or photo-realistic.` });

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: '1K'
      }
    }
  }));

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
