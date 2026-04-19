import { GoogleGenAI, ThinkingLevel, Type, FunctionDeclaration } from "@google/genai";
import { getComponentDatabaseSummary, getTemplateSummary, DESIGN_PRACTICES, COMMUNITY_SOURCES } from '../designDatabase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

export async function generateLaserDesign(prompt: string, style: string = "minimalist", aspectRatio: string = "1:1") {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: {
      parts: [{ text: `Generate a high-contrast, black and white stencil suitable for laser engraving of: ${prompt}. 
      Style preference: ${style}. 
      Focus on ${style === 'organic' ? 'fluid, natural curves and voronoi-like patterns' : 
                style === 'classical' ? 'balanced, symmetrical, and ornate traditional details' : 
                style === 'deconstructivist' ? 'fragmented, non-rectilinear shapes and chaotic complexity' : 
                'clean lines and stark contrast'}. 
      The output should be clearly reproducible on wood or metal.` }]
    },
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
7. Think about what goes into the project systematically: What are ALL the subsystems? What interfaces between them?`;

export async function consultLaserExpert(query: string, history: any[] = [], useThinking: boolean = false) {
  const modelName = useThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
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
      tools: [{ functionDeclarations: [SAVE_PRESET_TOOL, GENERATE_BLUEPRINT_TOOL] }, { googleSearch: {} }],
      thinkingConfig: useThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
    }
  });

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
  advisorContext: string = ''
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
3. For each laser-cut part, generate SVG path markup with real dimensions
4. For electronics, generate a text wiring diagram showing every connection
5. Use REAL component names and part numbers from the database above
6. Generate REAL firmware/control code (Arduino/MicroPython) that compiles
7. Provide step-by-step assembly instructions
8. Consider tolerances, interference fits, and DFM rules
`;

  const contextSection = advisorContext 
    ? `\n\nCONTEXT FROM DESIGN ADVISOR SESSION:\n${advisorContext}\n` 
    : '';

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `${systemPrompt}

PROJECT REQUEST: ${prompt}
${contextSection}
Configured Printer: ${printer}
Design Style: ${designStyle}

Generate a complete, actionable prototype blueprint. Every part should be designed, not just named.
Focus on ${designStyle === 'organic' ? 'fluid, natural curves and voronoi patterns' : 
          designStyle === 'classical' ? 'balanced, symmetrical traditional details' : 
          designStyle === 'deconstructivist' ? 'fragmented, non-rectilinear chaotic complexity' : 
          'clean lines and stark minimal contrast'}.

Return exactly as JSON.`,
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
          openscadCode: { type: Type.STRING, description: "Complete OpenSCAD code for ALL 3D-printable custom parts. Each part as a module. Include assembly visualization." },
          svgDesign: { type: Type.STRING, description: "SVG markup for laser-cut parts with real dimensions in mm. Include kerf compensation notes." },
          wiringDiagram: { type: Type.STRING, description: "Full text wiring diagram showing EVERY connection: component pin → wire color → destination pin" },
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
  });

  return JSON.parse(response.text);
}
