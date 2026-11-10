import { describe, expect, it } from 'vitest'
import { requestBody, requestUrl } from '../src/tts'

describe('ElevenLabs request', () => {
  it('uses the exact settings from SPEC.md', () => {
    expect(requestUrl()).toMatchInlineSnapshot(`"https://api.elevenlabs.io/v1/text-to-speech/4aEwu7MlAcY3VhYhcoDz?output_format=mp3_44100_128"`)
    expect(requestBody('[whispers] Tere.', 'Eelmine.', 'Järgmine.')).toMatchInlineSnapshot(`
      {
        "language_code": "et",
        "model_id": "eleven_v4",
        "next_text": "Järgmine.",
        "previous_text": "Eelmine.",
        "text": "[whispers] Tere.",
        "voice_settings": {
          "clone_strength": 0,
          "similarity_boost": 0.75,
          "stability": 0.5,
        },
      }
    `)
  })
  it('omits previous/next text when there is none', () => {
    expect(requestBody('Tere.')).not.toHaveProperty('previous_text')
    expect(requestBody('Tere.')).not.toHaveProperty('next_text')
  })
})
