// ElevenLabs settings. Must match SPEC.md 1:1. Not user-editable on purpose.
// Verified against the ElevenLabs API reference (POST /v1/text-to-speech/{voice_id}).
export const VOICE_ID = '4aEwu7MlAcY3VhYhcoDz' // "Emppu - Deep Finnish Narrator"
export const MODEL_ID = 'eleven_v4' // "Eleven v4" (not v4 Turbo, not multilingual v2)
export const LANGUAGE_CODE = 'et'
export const OUTPUT_FORMAT = 'mp3_44100_128' // query parameter
export const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  clone_strength: 0, // UI "Clone strength" 0%
} as const
// No audio_effects: the field is simply not sent.

export const API_BASE = 'https://api.elevenlabs.io'

// Chunking. Eleven v4 allows 10,000 chars per request; we aim for ~800–1500.
export const CHUNK_TARGET = 800
export const CHUNK_MAX = 1500

// Every setting that changes the audio. Part of the cache key.
export const SETTINGS = {
  voice_id: VOICE_ID,
  model_id: MODEL_ID,
  language_code: LANGUAGE_CODE,
  output_format: OUTPUT_FORMAT,
  voice_settings: VOICE_SETTINGS,
}
