import type { Chunk } from './chunk'
import * as db from './db'
import { cacheKey } from './hash'

// ⚙ panel: API keys (ElevenLabs, Google Vision; the only stored settings), book character count, Download MP3,
// Start a new book, Reload app.
export function wireSettings(
  dialog: HTMLDialogElement,
  getChunks: () => Chunk[],
  onKey: (key: string) => void,
  onClear: () => Promise<void>,
) {
  const keyInput = dialog.querySelector<HTMLInputElement>('#key')!
  const chars = dialog.querySelector('#chars')!
  const missing = dialog.querySelector('#missing')!
  const download = dialog.querySelector<HTMLButtonElement>('#download')!

  db.get<string>('kv', 'apiKey').then((key) => {
    keyInput.value = key ?? ''
    onKey(key ?? '')
  })
  keyInput.addEventListener('change', () => {
    const key = keyInput.value.trim()
    db.put('kv', 'apiKey', key)
    onKey(key)
  })

  const gkeyInput = dialog.querySelector<HTMLInputElement>('#gkey')!
  db.get<string>('kv', 'visionKey').then((key) => (gkeyInput.value = key ?? ''))
  gkeyInput.addEventListener('change', () => db.put('kv', 'visionKey', gkeyInput.value.trim()))

  async function cachedParts() {
    const chunks = getChunks()
    const parts = await Promise.all(chunks.map(async (c) => db.get<Blob>('audio', await cacheKey(c.text))))
    return { parts: parts.filter((p): p is Blob => !!p), total: chunks.length }
  }

  async function refresh() {
    const chunks = getChunks()
    chars.textContent = chunks.reduce((n, c) => n + c.text.length, 0).toLocaleString('et-EE')
    missing.textContent = 'Checking saved audio…'
    const { parts, total } = await cachedParts()
    missing.textContent = total === parts.length
      ? `All ${total} chunks are generated.`
      : `${total - parts.length} of ${total} chunks aren't generated yet and will be left out.`
    download.disabled = parts.length === 0
  }

  download.addEventListener('click', async () => {
    const { parts } = await cachedParts()
    const url = URL.createObjectURL(new Blob(parts, { type: 'audio/mpeg' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'book.mp3' })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  })

  dialog.querySelector('#reload')!.addEventListener('click', () => location.reload())
  dialog.querySelector('#clear')!.addEventListener('click', async () => {
    if (!confirm('Delete all pages and their audio, and start a new book?')) return
    await onClear()
    dialog.close()
  })

  return {
    open() {
      dialog.showModal()
      refresh()
    },
  }
}
