import { describe, expect, it } from 'vitest'
import { SETTINGS } from '../src/config'
import { cacheKey } from '../src/hash'

describe('cache key', () => {
  it('is stable for the same text and settings', async () => {
    expect(await cacheKey('Tere.')).toBe(await cacheKey('Tere.'))
    expect(await cacheKey('Tere.')).toMatch(/^[0-9a-f]{64}$/)
  })
  it('changes when the text changes', async () => {
    expect(await cacheKey('Tere.')).not.toBe(await cacheKey('[whispers] Tere.'))
  })
  it('changes when any setting changes', async () => {
    const other = { ...SETTINGS, voice_settings: { ...SETTINGS.voice_settings, stability: 0.6 } }
    expect(await cacheKey('Tere.')).not.toBe(await cacheKey('Tere.', other))
  })
})
