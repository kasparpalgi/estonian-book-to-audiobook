import { CHUNK_MAX, CHUNK_TARGET } from './config'
import { splitSentences, TERMINAL } from './sentences'

export interface Ref {
  pageId: string
  p: number // paragraph index on the page
  s: number // sentence index in the paragraph
}
export interface Chunk {
  text: string
  refs: Ref[]
}
interface Unit {
  ref: Ref
  text: string
  paraEnd: boolean
}

export function toUnits(pages: { id: string; paragraphs: string[] }[]): Unit[] {
  const units: Unit[] = []
  for (const page of pages) {
    page.paragraphs.forEach((para, p) => {
      const sentences = splitSentences(para)
      sentences.forEach((text, s) => {
        units.push({ ref: { pageId: page.id, p, s }, text, paraEnd: s === sentences.length - 1 })
      })
    })
  }
  return units
}

// Pack sentences into chunks. A chunk ends at the first real paragraph end
// (one that finishes a sentence) after `target` chars, and never exceeds `max`
// unless a single sentence is longer. A paragraph cut by a page break is glued.
export function buildChunks(
  pages: { id: string; paragraphs: string[] }[],
  target = CHUNK_TARGET,
  max = CHUNK_MAX,
): Chunk[] {
  const chunks: Chunk[] = []
  let text = ''
  let refs: Ref[] = []
  let prev: Unit | undefined
  const flush = () => {
    if (text) chunks.push({ text, refs })
    text = ''
    refs = []
  }
  for (const unit of toUnits(pages)) {
    let sep = ' '
    if (prev?.paraEnd && TERMINAL.test(prev.text)) sep = '\n\n'
    if (text && text.length + sep.length + unit.text.length > max) flush()
    if (!text) sep = ''
    if (sep === ' ' && prev?.paraEnd && /\p{L}-$/u.test(text) && /^\p{Ll}/u.test(unit.text)) {
      text = text.slice(0, -1) // word hyphenated across a page break
      sep = ''
    }
    text += sep + unit.text
    refs.push(unit.ref)
    if (unit.paraEnd && TERMINAL.test(unit.text) && text.length >= target) flush()
    prev = unit
  }
  flush()
  return chunks
}

export const sameRef = (a: Ref, b: Ref) => a.pageId === b.pageId && a.p === b.p && a.s === b.s

export function chunkIndexOf(chunks: Chunk[], ref: Ref): number {
  return chunks.findIndex((c) => c.refs.some((r) => sameRef(r, ref)))
}
