import { API_BASE, LANGUAGE_CODE, MODEL_ID, OUTPUT_FORMAT, VOICE_ID, VOICE_SETTINGS } from './config'

export const requestUrl = () =>
  `${API_BASE}/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`

// Text goes in unchanged, audio tags like [whispers] included.
export function requestBody(text: string, previousText?: string, nextText?: string) {
  return {
    text,
    model_id: MODEL_ID,
    language_code: LANGUAGE_CODE,
    voice_settings: { ...VOICE_SETTINGS },
    ...(previousText ? { previous_text: previousText } : {}),
    ...(nextText ? { next_text: nextText } : {}),
  }
}

export async function synthesize(
  apiKey: string,
  text: string,
  previousText?: string,
  nextText?: string,
): Promise<Blob> {
  if (!apiKey) throw new Error('Add your ElevenLabs API key in ⚙ first.')
  let res: Response
  try {
    res = await fetch(requestUrl(), {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify(requestBody(text, previousText, nextText)),
    })
  } catch {
    throw new Error('Could not reach ElevenLabs. Are you online?')
  }
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.blob()
}

// ElevenLabs errors look like {detail: {status, message}} or {detail: "..."}
// or {detail: [{msg}]} for validation errors. Show them as they are.
async function errorMessage(res: Response): Promise<string> {
  const raw = await res.text()
  let message = raw
  try {
    const detail = JSON.parse(raw).detail
    if (typeof detail === 'string') message = detail
    else if (Array.isArray(detail)) message = detail.map((d) => d.msg).join('; ')
    else if (detail?.message) message = `${detail.message}${detail.status ? ` (${detail.status})` : ''}`
  } catch {
    /* not JSON, show raw text */
  }
  return `ElevenLabs error ${res.status}: ${message || res.statusText}`
}
