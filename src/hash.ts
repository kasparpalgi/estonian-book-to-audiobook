import { SETTINGS } from './config'

// Cache key for one chunk's MP3: sha256 of the text plus every audio setting.
export async function cacheKey(text: string, settings: object = SETTINGS): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify({ text, settings }))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
