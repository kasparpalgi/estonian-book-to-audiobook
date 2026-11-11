// Split a paragraph into sentences and join them back. split → join is lossless
// for cleaned text (single spaces between sentences).
export function splitSentences(paragraph: string): string[] {
  const parts = paragraph.split(/(?<=[.!?…]["»”“’)]*)\s+(?=\S)/)
  return parts.filter((s) => s.length > 0)
}

export function joinSentences(sentences: string[]): string {
  return sentences.map((s) => s.trim()).filter(Boolean).join(' ')
}

// Closing quotes include “ (U+201C): Estonian dialogue is „…“.
export const TERMINAL = /[.!?…]["»”“’)]*$/
