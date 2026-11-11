import { createWorker, type Worker } from 'tesseract.js'
import * as db from './db'
import { upright } from './upright'
import { visionOcr } from './vision'

const LOW_CONFIDENCE = 70 // words below this get a dotted underline

export interface OcrResult {
  text: string
  lowConf: string[]
}

// One shared worker; jobs run one at a time so a phone doesn't run out of memory.
let worker: Promise<Worker> | undefined
let report: (progress: number) => void = () => {}
let queue: Promise<unknown> = Promise.resolve()

function getWorker(): Promise<Worker> {
  worker ??= createWorker('est', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') report(m.progress)
    },
  })
  return worker
}

// With a Google Vision key: Google reads the page (much better on phone photos).
// Without one, or offline: tesseract on the device.
export function ocr(image: Blob, onProgress: (progress: number) => void): Promise<OcrResult> {
  const job = queue.then(async () => {
    const photo = await upright(image)
    const key = await db.get<string>('kv', 'visionKey')
    return (key && (await visionOcr(photo, key))) || tesseract(photo, onProgress)
  })
  queue = job.catch(() => {})
  return job
}

async function tesseract(photo: Blob, onProgress: (progress: number) => void): Promise<OcrResult> {
  report = onProgress
  const { data } = await (await getWorker()).recognize(photo, {}, { text: true, blocks: true })
  const words = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)))
  const lowConf = words
    .filter((w) => w.confidence < LOW_CONFIDENCE)
    .map((w) => w.text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''))
    .filter(Boolean)
  return { text: data.text, lowConf }
}
