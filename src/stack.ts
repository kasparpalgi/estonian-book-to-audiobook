import type { Ref } from './chunk'

interface Handlers {
  jump: (ref: Ref) => void
  edit: (ref: Ref, text: string, span: HTMLElement) => void
  menu: (pageId: string) => void
}

const refOf = (span: HTMLElement): Ref => ({
  pageId: span.closest<HTMLElement>('.card')!.dataset.id!,
  p: Number(span.dataset.p),
  s: Number(span.dataset.s),
})

function caretAt(x: number, y: number) {
  const range = document.caretRangeFromPoint?.(x, y)
  if (!range) return
  getSelection()?.removeAllRanges()
  getSelection()?.addRange(range)
}

// Tap a sentence: jump there and edit it inline. Long-press a card: page menu.
export function wireStack(stack: HTMLElement, on: Handlers) {
  let pressTimer = 0
  let pressed = false
  let start = { x: 0, y: 0 }

  stack.addEventListener('pointerdown', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.card')
    if (!card || (e.target as HTMLElement).isContentEditable) return
    pressed = false
    start = { x: e.clientX, y: e.clientY }
    pressTimer = window.setTimeout(() => {
      pressed = true
      on.menu(card.dataset.id!)
    }, 550)
  })
  const cancel = () => clearTimeout(pressTimer)
  stack.addEventListener('pointerup', cancel)
  stack.addEventListener('pointercancel', cancel)
  stack.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel()
  })
  stack.addEventListener('contextmenu', (e) => e.preventDefault())

  stack.addEventListener('click', (e) => {
    const span = (e.target as HTMLElement).closest<HTMLElement>('.s')
    if (pressed || !span || span.isContentEditable) return
    const before = span.textContent ?? ''
    span.contentEditable = 'plaintext-only'
    span.focus()
    caretAt(e.clientX, e.clientY)
    on.jump(refOf(span))
    span.addEventListener(
      'blur',
      () => {
        span.contentEditable = 'false'
        const after = span.textContent ?? ''
        if (after !== before) on.edit(refOf(span), after, span)
      },
      { once: true },
    )
  })

  stack.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).isContentEditable) {
      e.preventDefault()
      ;(e.target as HTMLElement).blur()
    }
  })
}
