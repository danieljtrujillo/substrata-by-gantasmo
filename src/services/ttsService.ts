import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

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

function getAudioContext(): AudioContext {
  if (!currentAudioContext) {
    currentAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return currentAudioContext;
}

function decodeRawAudio(base64Audio: string): AudioBuffer {
  const audioContent = atob(base64Audio);
  const buffer = new ArrayBuffer(audioContent.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < audioContent.length; i++) {
    view[i] = audioContent.charCodeAt(i);
  }
  const ctx = getAudioContext();
  const audioBuffer = ctx.createBuffer(1, view.length / 2, 24000);
  const channelData = audioBuffer.getChannelData(0);
  const int16View = new Int16Array(buffer);
  for (let i = 0; i < int16View.length; i++) {
    channelData[i] = int16View[i] / 32768;
  }
  return audioBuffer;
}

/** Generate TTS audio and return the raw AudioBuffer without playing it */
export async function generateAudioBuffer(
  text: string,
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'
): Promise<AudioBuffer | null> {
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
  if (!base64Audio) return null;
  return decodeRawAudio(base64Audio);
}

/** Play an AudioBuffer. Returns the source node for stopping. */
export function playBuffer(buf: AudioBuffer): AudioBufferSourceNode {
  cancelSpeech();
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.connect(ctx.destination);
  source.start();
  currentAudioSource = source;
  return source;
}

/** Legacy: generate + immediately play (used when not per-message) */
export async function speakText(text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore') {
  const buf = await generateAudioBuffer(text, voice);
  if (buf) playBuffer(buf);
}
