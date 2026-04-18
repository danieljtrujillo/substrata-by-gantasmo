import { GoogleGenAI, ThinkingLevel, Type, FunctionDeclaration } from "@google/genai";

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
        { text: "Identify the material in this image. Is it suitable for laser engraving? Suggest optimal power (0-100%) and speed (mm/min) settings for an ACMER S1 2.5W diode laser. Also suggest if it needs masking tape." }
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

const ADVISOR_SYSTEM_INSTRUCTION = `You are a world-class laser engraving specialist for the ACMER S1. 
Your goal is to provide concise, practical advice on materials, settings, and safety.
RULES:
1. Be brief. High density of information, low word count.
2. ALWAYS end your response with: "Would you like to know more?" (unless you are confirming a tool call).
3. If the user wants to save settings for a material, trigger the 'save_material_preset' tool.
4. If asked about a material, suggest specific ACMER S1 settings (Power, Speed, passes) and offer to save them.`;

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
      tools: [{ functionDeclarations: [SAVE_PRESET_TOOL] }, { googleSearch: {} }],
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
                { text: "Transcribe this audio prompt for a laser engraving design." }
            ]
        }
    });
    return response.text;
}
