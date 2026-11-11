import { describe, expect, it } from 'vitest'
import { cleanText } from '../src/clean'
import { visionText, type Annotation } from '../src/vision'

// A Vision word: one symbol per letter, the break on the last symbol.
const w = (text: string, brk = 'SPACE', confidence = 0.99) => ({
  confidence,
  symbols: [...text].map((ch, i, all) => ({
    text: ch,
    ...(i === all.length - 1 && brk ? { property: { detectedBreak: { type: brk } } } : {}),
  })),
})
const para = (...words: ReturnType<typeof w>[]) => ({ words })

describe('Google Vision text', () => {
  const annotation: Annotation = {
    pages: [{
      blocks: [
        { paragraphs: [para(w('Kuidas'), w('Jaan', 'LINE_BREAK'))] },
        { paragraphs: [
          para(w('Võta'), w('aga', 'SPACE', 0.4), w('tas', 'HYPHEN'), w('kust', ''), w(',', 'SPACE'), w('ega'), w('vaja', ''), w('.', 'LINE_BREAK')),
          para(w('12', 'LINE_BREAK')),
        ] },
      ],
    }],
  }
  it('rebuilds lines and paragraphs, and cleanText joins the hyphen', () => {
    const { text, lowConf } = visionText(annotation)
    expect(text).toBe('Kuidas Jaan\n\nVõta aga tas-\nkust, ega vaja.\n\n12\n\n')
    expect(cleanText(text)).toEqual(['Kuidas Jaan', 'Võta aga taskust, ega vaja.'])
    expect(lowConf).toEqual(['aga'])
  })
  it('handles a page with no text', () => {
    expect(visionText(undefined)).toEqual({ text: '', lowConf: [] })
  })
})
