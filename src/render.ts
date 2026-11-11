import type { Page } from './book'
import { splitSentences } from './sentences'

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
  const node = document.createElement(tag)
  node.className = className
  node.textContent = text
  return node
}

// Sentence text with [tags] muted and low-confidence words underlined.
export function fillSentence(span: HTMLElement, text: string, lowConf: Set<string>) {
  span.replaceChildren()
  for (const part of text.split(/(\[[^\]]*\])/)) {
    if (!part) continue
    if (part.startsWith('[') && part.endsWith(']')) {
      span.append(el('span', 'tag', part))
      continue
    }
    for (const word of part.split(/(\s+)/)) {
      const core = word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
      span.append(core && lowConf.has(core) ? el('span', 'low', word) : word)
    }
  }
}

export function pageCard(page: Page, number: number): HTMLElement {
  const card = el('article', 'card')
  card.dataset.id = page.id
  card.dataset.rev = String(page.rev)
  card.append(el('div', 'num', String(number)))
  if (page.status === 'ocr') {
    card.append(el('p', 'status', `Reading text…${page.progress ? ` ${Math.round(page.progress * 100)}%` : ''}`))
  } else if (page.status === 'error') {
    card.append(el('p', 'status', `Could not read this page: ${page.error}`))
  }
  const lowConf = new Set(page.lowConf)
  page.paragraphs.forEach((para, p) => {
    const paragraph = el('p')
    splitSentences(para).forEach((text, s) => {
      if (s > 0) paragraph.append(' ')
      const span = el('span', 's')
      span.dataset.p = String(p)
      span.dataset.s = String(s)
      fillSentence(span, text, lowConf)
      paragraph.append(span)
    })
    card.append(paragraph)
  })
  return card
}

// Keep existing cards (so an open edit survives); redraw only changed ones.
export function renderStack(stack: HTMLElement, pages: Page[]) {
  const existing = new Map([...stack.children].map((c) => [(c as HTMLElement).dataset.id, c as HTMLElement]))
  pages.forEach((page, i) => {
    let card = existing.get(page.id)
    existing.delete(page.id)
    if (!card || card.dataset.rev !== String(page.rev)) {
      const fresh = pageCard(page, i + 1)
      card ? card.replaceWith(fresh) : stack.append(fresh)
      card = fresh
    }
    card.querySelector('.num')!.textContent = String(i + 1)
    if (stack.children[i] !== card) stack.insertBefore(card, stack.children[i])
  })
  existing.forEach((card) => card.remove())
}

export function highlight(stack: HTMLElement, refs: { pageId: string; p: number; s: number }[]) {
  stack.querySelectorAll('.reading').forEach((n) => n.classList.remove('reading'))
  for (const r of refs) {
    stack.querySelector(`[data-id="${r.pageId}"] .s[data-p="${r.p}"][data-s="${r.s}"]`)?.classList.add('reading')
  }
}
