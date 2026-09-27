// Gemini Live configuration.
// Kept as a single source of truth used by both the server-side ephemeral-token
// route (app/api/gemini-live-token/route.ts) and the browser-side session
// wrapper (lib/gemini/session.ts).

// Default = gemini-3.8-live (stable Live-API model per Google's current docs).
// gemini-live-2.5-flash-preview was shut down on 2025-12-09 — do NOT reintroduce.
// Note: gemini-3.8-live does not support thinkingConfig / thinkingLevel — we
// intentionally omit them from every LiveConnectConfig in this codebase.
export const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live'

// Gemini Live audio contract (fixed by the API today):
// - Input from mic:  16000 Hz, mono, PCM16 LE
// - Output from model: 24000 Hz, mono, PCM16 LE
export const INPUT_SAMPLE_RATE = 16000
export const OUTPUT_SAMPLE_RATE = 24000
export const INPUT_MIME_TYPE = `audio/pcm;rate=${INPUT_SAMPLE_RATE}`

// Ephemeral-token lifetimes.
// - newSessionExpireTime: window during which the browser may open a Live session.
// - expireTime: hard cutoff of that Live session (Gemini may close preemptively).
export const NEW_SESSION_WINDOW_SECONDS = 120       // browser has 2 min to connect
export const SESSION_MAX_DURATION_SECONDS = 30 * 60 // 30 min class ceiling

// Server VAD tuning — matches the natural-conversation feel the OpenAI route
// was tuned for (threshold ≈ 0.35, silence ≈ 1000 ms, interrupt on speech start).
// See app/api/realtime-session/route.ts for the OpenAI counterpart.
export const VAD_PREFIX_PADDING_MS = 500
export const VAD_SILENCE_DURATION_MS = 900
