import { cleanText } from './clean'
import type { Ref } from './chunk'
import * as db from './db'
import { ocr } from './ocr'
import { joinSentences, splitSentences } from './sentences'

export interface Page {
  id: string
  status: 'ocr' | 'done' | 'error'
  progress: number
  paragraphs: string[]
  lowConf: string[]
  image?: Blob // kept only until OCR is done
  error?: string
  rev: number // bumped on every change that needs the card redrawn
}

export const pages: Page[] = []
let listener: () => void = () => {}
export const onChange = (fn: () => void) => (listener = fn)

const saveOrder = () => db.put('kv', 'order', pages.map((p) => p.id))
const save = (page: Page) => db.put('pages', page.id, page)
function changed(page: Page) {
  page.rev++
  save(page)
  listener()
}

export async function load() {
  const order = (await db.get<string[]>('kv', 'order')) ?? []
  const stored = await db.all<Page>('pages')
  for (const id of order) {
    const page = stored.find((p) => p.id === id)
    if (page) pages.push(page)
  }
  pages.filter((p) => p.status === 'ocr' && p.image).forEach(runOcr) // resume
}

// Pages that can be read: in order, up to the first page still being OCR'd.
export function readyPages(): Page[] {
  const end = pages.findIndex((p) => p.status === 'ocr')
  return pages.slice(0, end === -1 ? undefined : end).filter((p) => p.status === 'done')
}

export function addPages(files: File[]) {
  for (const image of files) {
    const page: Page = { id: crypto.randomUUID(), status: 'ocr', progress: 0, paragraphs: [], lowConf: [], image, rev: 0 }
    pages.push(page)
    save(page)
    runOcr(page)
  }
  saveOrder()
  listener()
}

async function runOcr(page: Page) {
  try {
    const result = await ocr(page.image!, (progress) => {
      page.progress = progress
      page.rev++
      listener()
    })
    const context = pages.filter((p) => p !== page).flatMap((p) => p.paragraphs).join(' ')
    Object.assign(page, { paragraphs: cleanText(result.text, context), lowConf: result.lowConf, status: 'done', image: undefined })
  } catch (e) {
    Object.assign(page, { status: 'error', error: e instanceof Error ? e.message : String(e) })
  }
  if (pages.includes(page)) changed(page)
}

export function retake(id: string, image: File) {
  const page = pages.find((p) => p.id === id)
  if (!page) return
  Object.assign(page, { status: 'ocr', progress: 0, paragraphs: [], lowConf: [], image, error: undefined })
  changed(page)
  runOcr(page)
}

export function remove(id: string) {
  const i = pages.findIndex((p) => p.id === id)
  if (i === -1) return
  pages.splice(i, 1)
  db.del('pages', id)
  saveOrder()
  listener()
}

// Start a new book: drop every page, its saved audio and the reading position.
export async function clearAll() {
  pages.length = 0
  await Promise.all([db.clear('pages'), db.clear('audio'), db.del('kv', 'position'), saveOrder()])
  listener()
}

// Replace one sentence. Returns true if the card must be redrawn
// (the edit added or removed sentences, so indexes shifted).
export function editSentence(ref: Ref, text: string): boolean {
  const page = pages.find((p) => p.id === ref.pageId)
  if (!page) return false
  const sentences = splitSentences(page.paragraphs[ref.p])
  sentences[ref.s] = text.replace(/\s+/g, ' ').trim()
  page.paragraphs[ref.p] = joinSentences(sentences)
  // Compare whole sentences, not counts: "Tere. Maailm" can shift a boundary.
  const reshaped = splitSentences(page.paragraphs[ref.p]).join('\n') !== sentences.join('\n')
  if (reshaped) {
    page.paragraphs = page.paragraphs.filter(Boolean)
    changed(page)
  } else {
    save(page)
    listener()
  }
  return reshaped
}
