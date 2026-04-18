import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let currentAudioSource: AudioBufferSourceNode | null = null;
let currentAudioContext: AudioContext | null = null;

export function cancelSpeech() {
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
    } catch (e) {
      // Ignored
    }
    currentAudioSource = null;
  }
}

export async function speakText(text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore') {
  cancelSpeech(); // Stop existing speech

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const audioContent = atob(base64Audio);
    const buffer = new ArrayBuffer(audioContent.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < audioContent.length; i++) {
        view[i] = audioContent.charCodeAt(i);
    }
    
    if (!currentAudioContext) {
        currentAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    const audioBuffer = currentAudioContext.createBuffer(1, view.length / 2, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    // Convert Int16 to Float32
    const int16View = new Int16Array(buffer);
    for (let i = 0; i < int16View.length; i++) {
        channelData[i] = int16View[i] / 32768;
    }
    
    const source = currentAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(currentAudioContext.destination);
    source.start();
    currentAudioSource = source;
  }
}
