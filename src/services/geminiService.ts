import { GoogleGenAI, ThinkingLevel, Type, FunctionDeclaration } from "@google/genai";
import { getComponentDatabaseSummary, getTemplateSummary, DESIGN_PRACTICES, COMMUNITY_SOURCES } from '../designDatabase';
import { getStyleDirective, get3DStyleDirective, getSketchStyleDirective, type DesignStyle } from '../styleGuides';
import { getStyleSnippetHeader, getStyleSnippetDirective, withStyleHeader } from '../lib/styleSnippets';
import { getRegistrySummary, getDfmSummary } from '../engineeringRegistry';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

function getResponseText(response: { text?: string }): string {
  if (!response.text) {
    throw new Error("Gemini response did not include any text content.");
  }
  return response.text;
}

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

${getRegistrySummary()}

${getDfmSummary()}

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

export async function consultLaserExpert(query: string, history: any[] = [], useThinking: boolean = false, imageBase64?: string) {
  const modelName = useThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  
  // Build user parts with optional image
  const userParts: any[] = [];
  if (imageBase64) {
    const raw = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    userParts.push({ inlineData: { data: raw, mimeType: 'image/png' } });
    userParts.push({ text: 'The user attached this image. Analyze it in context of their message:\n\n' });
  }
  userParts.push({ text: query });

  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: [
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: userParts }
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

// ── OpenSCAD Validation ──────────────────────────────────────
// Post-generation checks to ensure 3D code quality

function validateAndFixOpenSCAD(code: string): { code: string; warnings: string[] } {
  const warnings: string[] = [];
  let fixed = code;

  // Check for modules with no primitives
  const moduleRegex = /module\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = moduleRegex.exec(code)) !== null) {
    const name = match[1];
    let depth = 1;
    let pos = match.index + match[0].length;
    const start = pos;
    while (pos < code.length && depth > 0) {
      if (code[pos] === '{') depth++;
      else if (code[pos] === '}') depth--;
      pos++;
    }
    const body = code.slice(start, pos - 1);
    if (!/cube|cylinder|sphere|linear_extrude|rotate_extrude|polyhedron/.test(body)) {
      warnings.push(`Module "${name}" has no geometry primitives`);
    }
  }

  // Check for unrealistic dimensions (< 0.1mm or > 2000mm)
  const dimRegex = /(?:cube\(\[|cylinder\(.*?(?:r|h|d)\s*=\s*|sphere\(.*?(?:r|d)\s*=\s*)([\d.]+)/g;
  while ((match = dimRegex.exec(code)) !== null) {
    const dim = parseFloat(match[1]);
    if (dim > 0 && dim < 0.1) warnings.push(`Very small dimension (${dim}mm) found — may be a unit error`);
    if (dim > 2000) warnings.push(`Very large dimension (${dim}mm) found — may be a unit error`);
  }

  // Ensure assembly module exists
  if (!/module\s+assembly\s*\(/.test(code)) {
    warnings.push('No assembly() module found — parts may not be positioned relative to each other');
  }

  return { code: fixed, warnings };
}

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

${getRegistrySummary()}

${getDfmSummary()}

When generating a blueprint:
1. DECOMPOSE the project into clear subsystems
2. For each 3D printed part, generate working OpenSCAD code that produces the actual geometry
3. For each laser-cut part, generate a SEPARATE SVG drawing with real dimensions, separated by <!--PART_BREAK-->. Each SVG must have a <title> element with the part name.
4. For electronics, generate a Mermaid flowchart (graph LR or graph TD) showing every wiring connection between components, followed by ---TEXT--- and a text pin-by-pin listing
5. Use REAL component names and part numbers from the database above
6. Generate REAL firmware/control code (Arduino/MicroPython) that compiles
7. Provide step-by-step assembly instructions
8. Consider tolerances, interference fits, and DFM rules

CRITICAL 3D DESIGN RULES:
- ALL dimensions MUST be in millimeters (mm) — this is the only unit system
- Define shared interface dimensions as variables at the top (e.g. screw_d=3, wall=2.5, pcb_w=50)
- Parts that connect MUST share the same mounting hole positions and mating surface dimensions
- Use translate() to position parts relative to each other in the assembly() module
- For clearance fits: holes = shaft_diameter + 0.3mm (FDM)
- For press fits: hole = shaft_diameter - 0.2mm (FDM)
- Keep all parts within a realistic scale (most hobby projects: 20-300mm per axis)
- Always define origin consistently: front-left-bottom corner or center-bottom
- Every primitive MUST have explicit numeric dimensions, never hardcode 1 or 0.5 as placeholder

CRITICAL: GENERATE REAL 3D GEOMETRY WITH CSG OPERATIONS
Your OpenSCAD code must produce parts that actually LOOK like the real object, not just basic primitive shapes.
Use these techniques to create realistic geometry:
- difference() to cut holes, pockets, channels, and negative features from solid bodies
- union() to join multiple shapes into complex forms
- intersection() for creating shapes by overlapping
- hull() to create smooth organic transitions between primitives
- linear_extrude(height=H) with polygon() for 2D profile extrusion (ideal for complex profiles)
- rotate_extrude() for axially symmetric parts (knobs, wheels, pulleys)
- minkowski() for adding fillets/chamfers (use small sphere for rounding)
- for() loops for repeated features (mounting holes, fins, slots, patterns)
- Use the Engineering Parts Registry above — include the exact OpenSCAD modules for standard parts (NEMA17, 608 bearings, M3 bolts, etc.)

Examples of GOOD vs BAD:
BAD: A motor is just cylinder(d=42, h=40) — this is an anonymous cylinder
GOOD: A motor has a body (cube), boss (cylinder on top), shaft (thin cylinder extending out), mounting holes (difference with 4 cylinders at mount_spacing), wire channel (small cube cutout on back)
BAD: A bracket is just cube([20,20,2]) — this is just a flat rectangle
GOOD: A bracket has an L-shape (union of two cubes), mounting holes (difference with cylinders), rounded corners (minkowski with small sphere), and slots for adjustment
BAD: An enclosure is cube([100,60,40])
GOOD: An enclosure is difference() { cube([100,60,40]); translate([2,2,2]) cube([96,56,38]); } with mounting bosses, ventilation slots, LCD cutout, button holes, cable grommet holes

ALWAYS include an assembly() module that shows how ALL parts fit together with translate/rotate positioning.
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

${getStyleSnippetDirective(designStyle as DesignStyle)}

The following OpenSCAD style header will be PREPENDED to your output. Do not redefine these modules — call them by name in your geometry.
\`\`\`openscad
${getStyleSnippetHeader(designStyle as DesignStyle)}
\`\`\`

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
          openscadCode: { type: Type.STRING, description: "Complete OpenSCAD code for ALL 3D-printable custom parts. ALL DIMENSIONS IN MILLIMETERS. Define shared variables at top. Each part as a named module. MANDATORY: Use difference() to cut holes/pockets/channels, union() to combine shapes, hull() for smooth transitions. Parts must look like REAL objects, not basic primitives. A motor mount must have screw holes, a housing must be hollow with wall thickness, brackets must be L-shaped with mounting holes. Use for() loops for repeated features (bolt patterns, ventilation slots). Include rotate_extrude() for round parts, linear_extrude() with polygon() for complex profiles. Use the Engineering Parts Registry modules (NEMA17(), 608_bearing(), M3x10_bolt(), etc.) for standard components. Include an assembly() module placing all parts at real positions. Every module MUST contain geometry with actual mm dimensions." },
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

  const result = JSON.parse(getResponseText(response));

  // Validate and log warnings for the generated OpenSCAD code
  if (result.openscadCode) {
    result.openscadCode = withStyleHeader(designStyle as DesignStyle, result.openscadCode);
    const { warnings } = validateAndFixOpenSCAD(result.openscadCode);
    if (warnings.length > 0) {
      console.warn('[SUBSTRATA] OpenSCAD validation warnings:', warnings);
      result.designNotes = (result.designNotes || '') +
        '\n\n⚠️ 3D Model Notes: ' + warnings.join('. ') + '.';
    }
  }

  return result;
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

${getStyleSnippetDirective(designStyle as DesignStyle)}

The following style header is already prepended to the file — call these helpers by name; do not redefine them:
\`\`\`openscad
${getStyleSnippetHeader(designStyle as DesignStyle)}
\`\`\`

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

  return JSON.parse(getResponseText(response));
}

// ── PCB Schematic Generation (Hacker mode) ────────────────────
// Generates a circuit-graph IR that downstream tools render to .kicad_sch.
// The model is constrained to the Schematic shape via responseSchema, and
// validated against the IR's electrical rules before being returned.

import type { Schematic, CircuitFinding } from '../lib/circuitGraph';
import { validateSchematic } from '../lib/circuitGraph';

export interface PCBSchematicResult {
  schematic: Schematic;
  /** Validation findings from validateSchematic. Pass-through for the UI. */
  findings: CircuitFinding[];
  /** Whether any rule had severity 'error'. */
  hasErrors: boolean;
  /** Free-form summary the model wrote about its design. */
  summary: string;
}

export async function generatePCBSchematic(
  prompt: string,
  context: { projectName?: string; targetMcu?: string; powerVolts?: number; constraints?: string } = {},
): Promise<PCBSchematicResult> {
  const projectName = context.projectName ?? 'Schematic';
  const systemPrompt = `You are a PCB schematic designer. Output a complete, manufacturable
single-sheet schematic for the request below as JSON matching the provided schema.

Hard rules:
  • Every component has a unique ref designator (R1, R2, U1, J1, ...).
  • Every net joining N pins lists exactly N connections — no orphan pins.
  • Power-in pins MUST be connected to a power_out pin somewhere on the sheet.
  • Use canonical net names: GND, VCC, +3V3, +5V, +12V (no +3.3V, no Vcc).
  • Decoupling caps: every IC VCC/VDD pin gets a 100nF cap to GND, < 5mm placement.
  • Use real KiCad library symbols: "Device:R", "Device:C", "Device:LED",
    "Device:D_Schottky", "MCU_Microchip_ATmega:ATmega328P-PU",
    "MCU_Module:Arduino_Nano_v3.x", "RF_Module:ESP32-WROOM-32",
    "Connector_Generic:Conn_01x04" etc.
  • Pin types must be honest — power_in for VCC/GND on ICs, passive for
    resistor/cap leads, output/input/bidirectional for signal pins.
  • Place components on a 2.54mm grid (KiCad units = 0.1mm, so positions
    should be multiples of 25.4 in IR units).

Soft rules:
  • Use the smallest part that satisfies the requirement.
  • Add brief (one-line) descriptions for non-obvious component choices.
  • Add MPN for parts that benefit from sourcing (MCUs, regulators, sensors).`;

  const contextLines = [
    context.targetMcu     ? `Target MCU: ${context.targetMcu}` : '',
    context.powerVolts    ? `Supply voltage: ${context.powerVolts}V` : '',
    context.constraints   ? `Constraints: ${context.constraints}` : '',
  ].filter(Boolean).join('\n');

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `${systemPrompt}\n\nREQUEST: ${prompt}\n${contextLines}\n\nProject name: "${projectName}"`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          projectName: { type: Type.STRING },
          notes:       { type: Type.STRING },
          summary:     { type: Type.STRING, description: 'One-paragraph description of the design choices.' },
          sheets: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                size:  { type: Type.STRING, description: 'A4, A3, or USLetter' },
                rev:   { type: Type.STRING },
                date:  { type: Type.STRING },
                components: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ref:        { type: Type.STRING },
                      value:      { type: Type.STRING },
                      libId:      { type: Type.STRING },
                      footprint:  { type: Type.STRING },
                      mpn:        { type: Type.STRING },
                      description:{ type: Type.STRING },
                      pos: {
                        type: Type.OBJECT,
                        properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                        required: ['x', 'y'],
                      },
                      rotation: { type: Type.NUMBER, description: '0, 90, 180, or 270' },
                      pins: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            number: { type: Type.STRING },
                            name:   { type: Type.STRING },
                            type:   { type: Type.STRING, description: 'input|output|bidirectional|tri_state|passive|power_in|power_out|open_collector|open_emitter|unconnected|no_connect' },
                          },
                          required: ['number', 'name', 'type'],
                        },
                      },
                    },
                    required: ['ref', 'value', 'libId', 'pos', 'rotation', 'pins'],
                  },
                },
                nets: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name:     { type: Type.STRING },
                      netClass: { type: Type.STRING },
                      connections: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            componentRef: { type: Type.STRING },
                            pinNumber:    { type: Type.STRING },
                          },
                          required: ['componentRef', 'pinNumber'],
                        },
                      },
                    },
                    required: ['name', 'connections'],
                  },
                },
              },
              required: ['title', 'size', 'components', 'nets'],
            },
          },
        },
        required: ['projectName', 'summary', 'sheets'],
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  }));

  const parsed = JSON.parse(response.text ?? '{}');
  // Coerce rotation to one of the legal values; LLM occasionally returns floats.
  for (const sheet of parsed.sheets ?? []) {
    for (const c of sheet.components ?? []) {
      const r = Math.round((c.rotation ?? 0) / 90) * 90;
      c.rotation = ((r % 360) + 360) % 360;
    }
  }
  const schematic: Schematic = {
    projectName: parsed.projectName ?? projectName,
    notes: parsed.notes,
    sheets: parsed.sheets,
  };
  const findings = validateSchematic(schematic);
  return {
    schematic,
    findings,
    hasErrors: findings.some(f => f.severity === 'error'),
    summary: parsed.summary ?? '',
  };
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

// ── Style Fingerprint Validator ──────────────────────────────────────────────
// Second-pass check: render the generated 3D / sketch, send it to Flash with
// the style guide, and ask "does this image actually exhibit this style?"
// Returns a score + deviation list. Below the threshold, the caller can
// regenerate with the deviations injected as corrections.

export interface StyleFingerprintResult {
  /** 0..1 — how strongly the image exhibits the claimed style. */
  styleScore: number;
  matches: boolean;            // styleScore >= passThreshold
  /** Per-rule deviations the model identified in the image. */
  deviations: string[];
  /** Concrete edits to push the result more toward the style. */
  corrections: string[];
  /** Free-text rationale. */
  rationale: string;
}

export async function fingerprintStyle(
  renderedImageBase64: string,
  style: DesignStyle,
  opts: { passThreshold?: number; referenceImagesBase64?: string[] } = {},
): Promise<StyleFingerprintResult> {
  const threshold = opts.passThreshold ?? 0.7;
  const directive = get3DStyleDirective(style);

  const parts: any[] = [
    { text: `You are a strict design-style auditor. Score how strongly the IMAGE BELOW exhibits the
named style. Use the rules in the style guide as your rubric. Be ruthless: a 0.7
means "clearly this style"; 0.5 means "mostly but with significant deviations";
0.3 means "the style is detectable but the work undermines it." Don't grade on
a curve.

CLAIMED STYLE: ${style}

STYLE GUIDE:
${directive}` },
    { inlineData: { data: renderedImageBase64.split(',').pop()!, mimeType: 'image/png' } },
  ];

  if (opts.referenceImagesBase64?.length) {
    parts.push({ text: '\n\nREFERENCE EXEMPLARS of the target style for calibration:' });
    for (const ref of opts.referenceImagesBase64) {
      parts.push({ inlineData: { data: ref.split(',').pop()!, mimeType: 'image/png' } });
    }
  }

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-flash-preview',
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          styleScore:  { type: Type.NUMBER, description: '0..1' },
          deviations:  { type: Type.ARRAY,  items: { type: Type.STRING } },
          corrections: { type: Type.ARRAY,  items: { type: Type.STRING } },
          rationale:   { type: Type.STRING },
        },
        required: ['styleScore', 'deviations', 'corrections', 'rationale'],
      },
    },
  }));

  const parsed = JSON.parse(response.text ?? '{}');
  const styleScore = Math.max(0, Math.min(1, Number(parsed.styleScore) || 0));
  return {
    styleScore,
    matches: styleScore >= threshold,
    deviations:  parsed.deviations  ?? [],
    corrections: parsed.corrections ?? [],
    rationale:   parsed.rationale   ?? '',
  };
}

/**
 * Convenience: run a generator, fingerprint the result, and if it falls below
 * the threshold, re-run once with the corrections injected as additional
 * directive text. The generator function takes optional extra text that should
 * be appended to its prompt.
 */
export async function generateWithStyleGuard<T>(
  style: DesignStyle,
  generate: (extraDirective: string) => Promise<{ result: T; renderedImageBase64: string }>,
  opts: { passThreshold?: number; maxRetries?: number; referenceImagesBase64?: string[] } = {},
): Promise<{ result: T; fingerprint: StyleFingerprintResult; attempts: number }> {
  const maxRetries = opts.maxRetries ?? 1;
  let extra = '';
  let attempt = 0;
  let last: { result: T; renderedImageBase64: string } | null = null;
  let fp: StyleFingerprintResult | null = null;

  while (attempt <= maxRetries) {
    attempt++;
    last = await generate(extra);
    fp = await fingerprintStyle(last.renderedImageBase64, style, {
      passThreshold: opts.passThreshold,
      referenceImagesBase64: opts.referenceImagesBase64,
    });
    if (fp.matches) break;
    extra = `\n\nPRIOR ATTEMPT FAILED STYLE CHECK (score ${fp.styleScore.toFixed(2)}). Address these specific deviations:\n` +
            fp.deviations.map(d => `  - ${d}`).join('\n') +
            `\n\nApply these corrections:\n` +
            fp.corrections.map(c => `  - ${c}`).join('\n');
  }
  return { result: last!.result, fingerprint: fp!, attempts: attempt };
}

// ── Model vs. Description Validation (AI semantic check) ─────────────────────
// "Does this 3D model actually look like what it claims to be?"
// Pass a rendered screenshot + the model's claimed title/description.

export interface ModelValidationResult {
  matches: boolean;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
  suggestions: string[];
  dimensionWarnings: string[];
  summary: string;
}

export async function validateModelVsDescription(
  renderedImageBase64: string,
  modelTitle: string,
  modelDescription: string,
  expectedDimensionsMm?: { x?: number; y?: number; z?: number }
): Promise<ModelValidationResult> {
  const dimHint = expectedDimensionsMm
    ? `Expected bounding box: X=${expectedDimensionsMm.x ?? '?'}mm, Y=${expectedDimensionsMm.y ?? '?'}mm, Z=${expectedDimensionsMm.z ?? '?'}mm.`
    : '';

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: renderedImageBase64.replace(/^data:image\/\w+;base64,/, ''), mimeType: 'image/png' } },
        { text: `You are a 3D model quality inspector for a CAD/fabrication platform.

TASK: Verify the rendered model matches its claimed description.
MODEL TITLE: "${modelTitle}"
MODEL DESCRIPTION: "${modelDescription}"
${dimHint}

Check:
1. Does the geometry match the title/description? (e.g. "M5 bolt" should look like a bolt, not a cube)
2. Obvious geometry errors? (floating parts, missing faces, dark holes from inverted normals)
3. Are proportions plausible for the described object?
4. Any red flags — corrupted, wrong, or mislabeled file?

Return as JSON.` },
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matches: { type: Type.BOOLEAN },
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          issues: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          dimensionWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING },
        },
        required: ['matches', 'confidence', 'issues', 'suggestions', 'summary'],
      },
    },
  }));

  const r = JSON.parse(getResponseText(response));
  return {
    matches: r.matches ?? false,
    confidence: r.confidence ?? 'low',
    issues: r.issues ?? [],
    suggestions: r.suggestions ?? [],
    dimensionWarnings: r.dimensionWarnings ?? [],
    summary: r.summary ?? 'Validation inconclusive',
  };
}

// ── Architectural Blueprint Generation ───────────────────────────────────────
// Architecture/construction variant of generateProjectBlueprint.
// Produces: OpenSCAD massing with //LAYER: hints, 2D SVG floor plan,
// AIA layer assignments, IBC/ADA code notes, and material schedule.

export async function generateArchitecturalBlueprint(
  prompt: string,
  buildingType: 'residential' | 'commercial' | 'industrial' | 'mixed-use' | 'landscape' = 'residential',
  units: 'metric' | 'imperial' = 'metric',
  advisorContext = '',
  referenceImage?: string
): Promise<{
  name: string;
  description: string;
  openscadCode: string;
  floorPlanSvg: string;
  layerAssignments: Record<string, string>;
  buildingCodeNotes: string[];
  materialSchedule: Array<{ item: string; spec: string; qty: string; unit: string }>;
  assemblySteps: string[];
  communityRefs: string[];
}> {
  const unitNote = units === 'imperial'
    ? 'UNITS: dimensions in INCHES. In OpenSCAD multiply by 25.4 to get mm.'
    : 'UNITS: All dimensions in MILLIMETERS.';

  const sysPrompt = `You are a licensed architect and BIM modeler for ${buildingType} construction.
${unitNote}

AIA/NCS LAYER NAMES: A-WALL, A-DOOR, A-DOOR-SWNG, A-WIND, A-STAIR, A-ROOF, A-CEIL, A-FLOR, A-FURN, A-EQPM, S-COLS, S-BEAM, S-SLAB, S-FNDN, M-HVAC-SUPL, M-HVAC-RETN, P-PIPE-SANR, P-PIPE-DOMW, P-PIPE-FTPR, P-FIXT, E-LITE, E-POWR, E-PANL, C-PROP, C-TOPO, A-ANNO-DIMS, A-ANNO-TEXT, A-ANNO-GRDX, A-ANNO-SECT.

STANDARDS (metric):
- Exterior walls: 305mm thick; interior: 152mm thick
- Floor-to-floor: residential 2743mm (9'-0"), commercial 3658mm (12'-0")
- ADA door clear: ≥ 813mm; standard widths: 813, 914, 1067mm
- Window sill: 864mm residential, 915mm commercial; head: 2134mm
- Column grid: 6000–9000mm o.c. commercial; 4000–5000mm residential
- Stair rise ≤ 178mm, run ≥ 279mm (IBC 1011.5); ADA ramp ≤ 1:12
- Natural light: window area ≥ 8% of room floor area (IBC 1205.2)

OPENSCAD FOR ARCHITECTURE:
- Walls: cube([length, thickness, height]) with translate(); tag //LAYER: A-WALL
- Doors: difference() into wall + door_slab module + swing arc; tag //LAYER: A-DOOR
- Windows: difference() at sill/head heights; tag //LAYER: A-WIND
- Columns: cylinder(r=r, h=floor_h); tag //LAYER: S-COLS
- Slabs: cube([bx, by, slab_t]); tag //LAYER: S-SLAB
- Use for() loops for column grids, window bays, stair treads
- Include assembly() positioning all elements with translate()

FLOOR PLAN SVG (1px = 10mm):
- Walls: grey filled rect, stroke="black"
- Doors: stroke="blue" arc in opening + door slab rect
- Windows: stroke="cyan" triple parallel lines in wall break
- Dimensions: stroke="red" dashed lines, text labels in mm
- Column grid: circles at intersections, dashdot grid lines, grid bubble labels
- North arrow top-right; scale bar bottom-left
- Wrap entire plan in <svg> with <title> element

${advisorContext ? `SESSION CONTEXT:\n${advisorContext}\n` : ''}`;

  const contentParts: any[] = [];
  if (referenceImage) {
    contentParts.push({ inlineData: { data: referenceImage.split(',')[1], mimeType: 'image/png' } });
    contentParts.push({ text: 'REFERENCE: use for massing/layout inspiration.\n\n' });
  }
  contentParts.push({ text: `${sysPrompt}\n\nREQUEST: ${prompt}\n\nReturn as JSON.` });

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: { parts: contentParts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          openscadCode: { type: Type.STRING },
          floorPlanSvg: { type: Type.STRING },
          layerAssignments: { type: Type.OBJECT, additionalProperties: true },
          buildingCodeNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
          materialSchedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { item: { type: Type.STRING }, spec: { type: Type.STRING }, qty: { type: Type.STRING }, unit: { type: Type.STRING } },
              required: ['item', 'spec', 'qty', 'unit'],
            },
          },
          assemblySteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          communityRefs: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['name', 'description', 'openscadCode', 'floorPlanSvg', 'layerAssignments', 'buildingCodeNotes', 'assemblySteps'],
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  }));

  return JSON.parse(getResponseText(response));
}

// ── Markup Import & Analysis ─────────────────────────────────────────────────
// Open-source equivalent of AutoCAD Markup Import / Markup Assist.
// Feed it a redline/annotation image → get structured actionable change list.

export interface MarkupItem {
  id: string;
  type: 'dimension_change' | 'add_element' | 'remove_element' | 'move_element' | 'note' | 'question';
  description: string;
  affectedModule?: string;
  proposedChange?: string;
  priority: 'critical' | 'major' | 'minor' | 'info';
}

export interface MarkupAnalysisResult {
  markupItems: MarkupItem[];
  openscadPatch?: string;
  summary: string;
  unresolvedQuestions: string[];
}

export async function analyzeMarkupFeedback(
  markupImageBase64: string,
  currentOpenSCAD: string,
  projectContext = ''
): Promise<MarkupAnalysisResult> {
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: markupImageBase64.replace(/^data:image\/\w+;base64,/, ''), mimeType: 'image/png' } },
        { text: `You are a CAD reviewer parsing redline/markup feedback on a 3D design.

TASK: Extract every markup annotation from the image into structured, actionable instructions.

OPENSCAD CODE (for module name reference):
\`\`\`openscad
${currentOpenSCAD.slice(0, 2500)}${currentOpenSCAD.length > 2500 ? '\n// ... (truncated)' : ''}
\`\`\`
${projectContext ? `PROJECT CONTEXT: ${projectContext}\n` : ''}
For each annotation: classify type, extract numeric values, reference affected module, suggest code patch, assign priority.
Return as JSON.` },
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          markupItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING }, type: { type: Type.STRING },
                description: { type: Type.STRING }, affectedModule: { type: Type.STRING },
                proposedChange: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['critical', 'major', 'minor', 'info'] },
              },
              required: ['id', 'type', 'description', 'priority'],
            },
          },
          openscadPatch: { type: Type.STRING },
          summary: { type: Type.STRING },
          unresolvedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['markupItems', 'summary', 'unresolvedQuestions'],
      },
    },
  }));

  const r = JSON.parse(getResponseText(response));
  return {
    markupItems: r.markupItems ?? [],
    openscadPatch: r.openscadPatch,
    summary: r.summary ?? 'No markup detected',
    unresolvedQuestions: r.unresolvedQuestions ?? [],
  };
}

// ── AI Smart Block Detection ─────────────────────────────────────────────────
// Semantic block detection — finds assemblies geometry clustering alone misses.
// Equivalent to AutoCAD "Smart Blocks: Detect and Convert" but AI-powered.

export async function detectSemanticBlocks(openscadCode: string): Promise<{
  candidates: Array<{ name: string; modules: string[]; reasoning: string; priority: number }>;
  refactoredCode: string;
  summary: string;
}> {
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `You are an OpenSCAD expert performing a Smart Blocks refactor (like AutoCAD "Detect and Convert").

CODE:
\`\`\`openscad
${openscadCode}
\`\`\`

1. Find groups of modules that form one semantic assembly (e.g. door = slab + frame + hinges + swing arc) — suggest merging into one module.
2. Find duplicated inline primitives that should become named modules.
3. Rename generic module names (part_1, body, thing) to descriptive ones.
4. Return refactored code with all improvements applied.

Return as JSON.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          candidates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                modules: { type: Type.ARRAY, items: { type: Type.STRING } },
                reasoning: { type: Type.STRING },
                priority: { type: Type.NUMBER },
              },
              required: ['name', 'modules', 'reasoning', 'priority'],
            },
          },
          refactoredCode: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ['candidates', 'refactoredCode', 'summary'],
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  }));

  return JSON.parse(getResponseText(response));
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
