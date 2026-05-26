// Modality enum is a const value, so we still import it from the SDK at
// build time. NO client is instantiated — the TTS request goes through the
// /api/ai/relay Pages Function so GEMINI_API_KEY stays server-side.
import { Modality } from "@google/genai";

interface RelayResponse {
  text?: string;
  candidates?: any[];
}

async function relayGenerateContent(req: { model: string; contents: unknown; config?: Record<string, unknown> }): Promise<RelayResponse> {
  const r = await fetch('/api/ai/relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(req),
  });
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}));
    throw new Error(detail?.message ?? `relay failed (${r.status})`);
  }
  return r.json() as Promise<RelayResponse>;
}

const ai = { models: { generateContent: relayGenerateContent } };

// Centralised model — change once when upgrading.
// https://ai.google.dev/gemini-api/docs/models
export const TTS_MODEL = 'gemini-3.1-flash-tts-preview';

// All 30 prebuilt Gemini voices with their character descriptions.
// Names map directly to prebuiltVoiceConfig.voiceName.
// https://ai.google.dev/gemini-api/docs/speech-generation
export const TTS_VOICES = [
  { name: 'Zephyr',         character: 'Bright' },
  { name: 'Puck',           character: 'Upbeat' },
  { name: 'Charon',         character: 'Informative' },
  { name: 'Kore',           character: 'Firm' },
  { name: 'Fenrir',         character: 'Excitable' },
  { name: 'Leda',           character: 'Youthful' },
  { name: 'Orus',           character: 'Firm' },
  { name: 'Aoede',          character: 'Breezy' },
  { name: 'Callirrhoe',     character: 'Easy-going' },
  { name: 'Autonoe',        character: 'Bright' },
  { name: 'Enceladus',      character: 'Breathy' },
  { name: 'Iapetus',        character: 'Clear' },
  { name: 'Umbriel',        character: 'Easy-going' },
  { name: 'Algieba',        character: 'Smooth' },
  { name: 'Despina',        character: 'Smooth' },
  { name: 'Erinome',        character: 'Clear' },
  { name: 'Algenib',        character: 'Gravelly' },
  { name: 'Rasalgethi',     character: 'Informative' },
  { name: 'Laomedeia',      character: 'Upbeat' },
  { name: 'Achernar',       character: 'Soft' },
  { name: 'Alnilam',        character: 'Firm' },
  { name: 'Schedar',        character: 'Even' },
  { name: 'Gacrux',         character: 'Mature' },
  { name: 'Pulcherrima',    character: 'Forward' },
  { name: 'Achird',         character: 'Friendly' },
  { name: 'Zubenelgenubi',  character: 'Casual' },
  { name: 'Vindemiatrix',   character: 'Gentle' },
  { name: 'Sadachbia',      character: 'Lively' },
  { name: 'Sadaltager',     character: 'Knowledgeable' },
  { name: 'Sulafat',        character: 'Warm' },
] as const;

export type VoiceName = typeof TTS_VOICES[number]['name'];

export const DEFAULT_VOICE: VoiceName = 'Kore';

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
  voice: VoiceName = DEFAULT_VOICE
): Promise<AudioBuffer | null> {
  const response = await ai.models.generateContent({
    model: TTS_MODEL,
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
export async function speakText(text: string, voice: VoiceName = DEFAULT_VOICE) {
  const buf = await generateAudioBuffer(text, voice);
  if (buf) playBuffer(buf);
}
