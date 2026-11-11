import type { OcrResult } from './ocr'

// Google Cloud Vision DOCUMENT_TEXT_DETECTION: the API behind Google Lens' text reading.
// Verified: the key works as the x-goog-api-key header, CORS allows this origin.
const ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'
const LOW_CONFIDENCE = 0.7 // 0–1 here; words below get a dotted underline

interface Symbol_ { text: string; property?: { detectedBreak?: { type: string } } }
interface Word { symbols: Symbol_[]; confidence?: number }
export interface Annotation { pages?: { blocks?: { paragraphs?: { words?: Word[] }[] }[] }[] }

// Breaks after a symbol. HYPHEN = "end-line hyphen that is not present in text".
const BREAK: Record<string, string> = { SPACE: ' ', SURE_SPACE: ' ', EOL_SURE_SPACE: '\n', LINE_BREAK: '\n', HYPHEN: '-\n' }

// Rebuild raw text: lines end with \n, Vision's paragraphs are split by a blank line,
// so cleanText() joins hyphens and lines exactly like it does for tesseract output.
export function visionText(annotation: Annotation | undefined): OcrResult {
  let text = ''
  const lowConf: string[] = []
  for (const page of annotation?.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const word of paragraph.words ?? []) {
          for (const s of word.symbols) {
            text += s.text
            const br = BREAK[s.property?.detectedBreak?.type ?? ''] ?? ''
            text += br === '-\n' && text.endsWith('-') ? '\n' : br
          }
          const core = word.symbols.map((s) => s.text).join('').replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
          if (core && (word.confidence ?? 1) < LOW_CONFIDENCE) lowConf.push(core)
        }
        text = text.trimEnd() + '\n\n'
      }
    }
  }
  return { text, lowConf }
}

const base64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

// Returns null when Google can't be reached (offline), so the caller can fall back.
export async function visionOcr(photo: Blob, key: string): Promise<OcrResult | null> {
  const body = {
    requests: [
      {
        image: { content: await base64(photo) },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: { languageHints: ['et'] },
      },
    ],
  }
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return null
  }
  const json = await res.json().catch(() => ({}))
  const error = json.error ?? json.responses?.[0]?.error // whole request / this image
  if (!res.ok || error) throw new Error(`Google Vision error ${error?.code ?? res.status}: ${error?.message ?? res.statusText}`)
  return visionText(json.responses?.[0]?.fullTextAnnotation)
}
