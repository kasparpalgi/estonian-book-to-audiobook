import { describe, expect, it } from 'vitest'
import { buildChunks, chunkIndexOf } from '../src/chunk'
import { CHUNK_MAX } from '../src/config'

const sentence = (i: number) => `See on lause number ${i}, mis on piisavalt pikk, et lugeda.`
const para = (from: number, n: number) => Array.from({ length: n }, (_, i) => sentence(from + i)).join(' ')

describe('chunking', () => {
  const pages = Array.from({ length: 6 }, (_, i) => ({
    id: `p${i}`,
    paragraphs: [para(i * 100, 4), para(i * 100 + 10, 9), para(i * 100 + 20, 30)],
  }))
  const chunks = buildChunks(pages)

  it('keeps every chunk under the limit', () => {
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(CHUNK_MAX)
  })
  it('loses no text', () => {
    const all = pages.flatMap((p) => p.paragraphs).join(' ')
    expect(chunks.map((c) => c.text).join(' ').replace(/\s+/g, ' ')).toBe(all)
  })
  it('cuts at paragraph boundaries when possible', () => {
    const small = buildChunks([{ id: 'a', paragraphs: [para(0, 10), para(20, 10), para(40, 10)] }], 500, 1500)
    expect(small.map((c) => c.text.split('\n\n').length)).toEqual([1, 1, 1])
  })
  it('glues a sentence cut by a page break, including a hyphenated word', () => {
    const glued = buildChunks([
      { id: 'a', paragraphs: ['Ta tuli koju ja vaa-'] },
      { id: 'b', paragraphs: ['tas aknast välja.'] },
    ])
    expect(glued).toEqual([
      { text: 'Ta tuli koju ja vaatas aknast välja.', refs: [{ pageId: 'a', p: 0, s: 0 }, { pageId: 'b', p: 0, s: 0 }] },
    ])
  })
  it('finds the chunk of a sentence', () => {
    expect(chunkIndexOf(chunks, chunks[2].refs[1])).toBe(2)
  })
})
