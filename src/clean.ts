import { TERMINAL } from './sentences'

const PAGE_NUMBER = /^[\s\-–—.]*\d{1,4}[\s\-–—.]*$/
const SOFT_HYPHEN_END = /\p{L}[-‐­¬]$/u // word broken across lines
const STARTS_LOWER = /^\p{Ll}/u
const WORD = /^\p{L}+$/u

// Raw OCR text of one page → clean paragraphs.
// `context` is other text from the book, used to spot obvious split-word joins.
export function cleanText(raw: string, context = ''): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => !PAGE_NUMBER.test(l))

  const widths = lines.filter(Boolean).map((l) => l.length).sort((a, b) => a - b)
  const median = widths[Math.floor(widths.length / 2)] ?? 0

  const groups: string[][] = [[]]
  for (const line of lines) {
    const current = groups[groups.length - 1]
    if (!line) {
      if (current.length) groups.push([])
      continue
    }
    current.push(line)
    // A short line ending a sentence is the last line of a paragraph.
    if (TERMINAL.test(line) && line.length < median * 0.75) groups.push([])
  }
  const paragraphs = groups.filter((g) => g.length).map(joinLines)
  const vocab = countWords(paragraphs.join(' ') + ' ' + context)
  return paragraphs.map((p) => joinSplitWords(p, vocab))
}

export function joinLines(lines: string[]): string {
  let out = lines[0] ?? ''
  for (const next of lines.slice(1)) {
    if (SOFT_HYPHEN_END.test(out) && STARTS_LOWER.test(next)) out = out.slice(0, -1) + next
    else if (SOFT_HYPHEN_END.test(out)) out += next // compound like "Kesk-Eesti"
    else out += ' ' + next
  }
  return out
}

export function countWords(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const token of text.toLowerCase().split(/[^\p{L}]+/u)) {
    if (token) counts.set(token, (counts.get(token) ?? 0) + 1)
  }
  return counts
}

// "kirjel danud" → "kirjeldanud", but only when "kirjeldanud" appears elsewhere
// and at least one fragment never appears on its own.
export function joinSplitWords(paragraph: string, vocab: Map<string, number>): string {
  const tokens = paragraph.split(' ')
  const out: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]
    const b = tokens[i + 1]
    if (b !== undefined && WORD.test(a)) {
      const bCore = b.match(/^\p{L}+/u)?.[0] ?? ''
      const joined = (a + bCore).toLowerCase()
      const count = (w: string) => vocab.get(w.toLowerCase()) ?? 0
      if (bCore && count(joined) > 0 && Math.min(count(a), count(bCore)) <= 1) {
        out.push(a + b)
        i++
        continue
      }
    }
    out.push(a)
  }
  return out.join(' ')
}
