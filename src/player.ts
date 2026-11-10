import { chunkIndexOf, sameRef, type Chunk, type Ref } from './chunk'
import * as db from './db'
import { cacheKey } from './hash'
import { synthesize } from './tts'

export interface PlayerState {
  playing: boolean
  loading: boolean
  refs: Ref[] // sentences of the current chunk
  error?: string
}

const audio = new Audio()
const inFlight = new Map<string, Promise<Blob>>()

// MP3 for chunk i: from the IndexedDB cache, or synthesized once and cached.
export async function chunkAudio(chunks: Chunk[], i: number, apiKey: string): Promise<Blob> {
  const key = await cacheKey(chunks[i].text)
  const cached = await db.get<Blob>('audio', key)
  if (cached) return cached
  if (!inFlight.has(key)) {
    const job = synthesize(apiKey, chunks[i].text, chunks[i - 1]?.text, chunks[i + 1]?.text)
      .then(async (blob) => (await db.put('audio', key, blob), blob))
      .finally(() => inFlight.delete(key))
    inFlight.set(key, job)
  }
  return inFlight.get(key)!
}

export function createPlayer(getChunks: () => Chunk[], apiKey: () => string, onState: (s: PlayerState) => void) {
  let position: Ref | undefined // first sentence of the current chunk
  let playing = false
  let loadedKey = '' // cache key of the chunk now in <audio>
  let lastRef: Ref | undefined // last sentence of the chunk now in <audio>
  let token = 0

  const index = () => Math.max(0, position ? chunkIndexOf(getChunks(), position) : 0)
  const report = (extra: Partial<PlayerState> = {}) =>
    onState({ playing, loading: false, refs: getChunks()[index()]?.refs ?? [], ...extra })

  function moveTo(i: number) {
    const chunks = getChunks()
    position = chunks[Math.max(0, Math.min(i, chunks.length - 1))]?.refs[0]
    if (position) db.put('kv', 'position', position)
  }

  async function play(i: number) {
    const chunks = getChunks()
    if (i >= chunks.length) return stop()
    moveTo(i)
    const mine = ++token
    playing = true
    report({ loading: true })
    try {
      const blob = await chunkAudio(chunks, i, apiKey())
      if (mine !== token) return
      URL.revokeObjectURL(audio.src)
      audio.src = URL.createObjectURL(blob)
      loadedKey = await cacheKey(chunks[i].text)
      lastRef = chunks[i].refs.at(-1)
      await audio.play()
      report()
      if (chunks[i + 1]) chunkAudio(chunks, i + 1, apiKey()).catch(() => {}) // prefetch next only
    } catch (e) {
      if (mine === token) stop((e as Error).message)
    }
  }

  function stop(error?: string) {
    playing = false
    token++
    audio.pause()
    report({ error })
  }

  // If the chunk grew while it played (a new page continued it), replay it
  // rather than skip the new sentences.
  function nextIndex() {
    const chunks = getChunks()
    const j = lastRef ? chunkIndexOf(chunks, lastRef) : -1
    return j !== -1 && !sameRef(chunks[j].refs.at(-1)!, lastRef!) ? j : index() + 1
  }
  audio.addEventListener('ended', () => playing && play(nextIndex()))

  return {
    restore: (ref?: Ref) => ((position = ref), report()),
    refresh: () => report(),
    async toggle() {
      if (playing) return stop()
      const chunk = getChunks()[index()]
      if (!chunk) return
      if (audio.src && loadedKey === (await cacheKey(chunk.text))) {
        playing = true
        await audio.play()
        report()
      } else play(index())
    },
    step(delta: number) {
      if (playing) return play(index() + delta)
      moveTo(index() + delta)
      loadedKey = ''
      report()
    },
    jumpTo(ref: Ref) {
      const i = chunkIndexOf(getChunks(), ref)
      if (i === -1) return
      if (playing) return play(i)
      moveTo(i)
      loadedKey = ''
      report()
    },
  }
}
