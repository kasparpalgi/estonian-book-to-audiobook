import './style.css'
import * as book from './book'
import { buildChunks, type Chunk, type Ref } from './chunk'
import * as db from './db'
import { createPlayer, type PlayerState } from './player'
import { fillSentence, highlight, renderStack } from './render'
import { splitSentences } from './sentences'
import { wireSettings } from './settings'
import { wireStack } from './stack'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const stack = $('stack')
const playButton = $<HTMLButtonElement>('play')
const pageMenu = $<HTMLDialogElement>('pagemenu')

let chunks: Chunk[] | null = null
const getChunks = () => (chunks ??= buildChunks(book.readyPages()))
let apiKey = ''
let shownChunk = ''
const icon = (d: string) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="${d}"/></svg>`
const PLAY = icon('M7 4v16l13-8z')
const PAUSE = icon('M6 4h4v16H6zM14 4h4v16h-4z')

function onState(state: PlayerState) {
  playButton.innerHTML = state.playing ? PAUSE : PLAY
  playButton.setAttribute('aria-label', state.playing ? 'Pause' : 'Play')
  playButton.classList.toggle('loading', state.loading)
  $('msg').textContent = state.error ?? (state.loading ? 'Generating audio…' : '')
  highlight(stack, state.refs)
  const first = JSON.stringify(state.refs[0] ?? '')
  const editing = (document.activeElement as HTMLElement | null)?.isContentEditable
  if (first !== shownChunk && (state.playing || !shownChunk) && !editing) {
    stack.querySelector('.reading')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  shownChunk = first
}
const player = createPlayer(getChunks, () => apiKey, onState)

book.onChange(() => {
  chunks = null
  renderStack(stack, book.pages)
  $('empty').hidden = book.pages.length > 0
  player.refresh()
})

wireStack(stack, {
  jump: (ref) => player.jumpTo(ref),
  edit(ref, text, span) {
    if (book.editSentence(ref, text)) return
    const page = book.pages.find((p) => p.id === ref.pageId)!
    fillSentence(span, splitSentences(page.paragraphs[ref.p])[ref.s], new Set(page.lowConf))
  },
  menu(pageId) {
    pageMenu.dataset.id = pageId
    pageMenu.showModal()
  },
})

// Open the camera inside the tap itself: iOS blocks file pickers opened later.
pageMenu.querySelector('[value=retake]')!.addEventListener('click', () => $('retake').click())
pageMenu.addEventListener('close', () => {
  if (pageMenu.returnValue === 'delete') book.remove(pageMenu.dataset.id!)
})
$<HTMLInputElement>('retake').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) book.retake(pageMenu.dataset.id!, input.files[0])
  input.value = ''
})

$<HTMLInputElement>('file').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  book.addPages([...(input.files ?? [])])
  input.value = ''
})
$('add').addEventListener('click', () => $('file').click())

const settings = wireSettings($<HTMLDialogElement>('settings'), getChunks, (key) => (apiKey = key))
$('gear').addEventListener('click', () => settings.open())
playButton.addEventListener('click', () => player.toggle())
$('prev').addEventListener('click', () => player.step(-1))
$('next').addEventListener('click', () => player.step(1))

await book.load()
renderStack(stack, book.pages)
$('empty').hidden = book.pages.length > 0
player.restore(await db.get<Ref>('kv', 'position'))

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
}
