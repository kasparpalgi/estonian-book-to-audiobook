# Handover: code review + testing

**What:** first full build of the PWA in `SPEC.md`: photograph Estonian book pages →
on-device OCR → ElevenLabs reads them → download one MP3. No backend.
**User guide:** `README.md`. **Agent rules:** `AGENTS.md`.

## Run it
```sh
npm install
npx playwright install chromium   # first time
npm test        # 18 unit tests
npm run e2e     # Playwright: add page → text → edit → play (OCR + ElevenLabs mocked)
npm run dev     # http://localhost:5173 (real OCR; real ElevenLabs with a key in ⚙)
npm run build && npm run preview  # production build at /estonian-book-to-audiobook/
```

## Already verified
| Check | Result |
|---|---|
| Unit tests (clean, chunk, cache key, request-body snapshot) | 18/18 pass |
| Playwright test | passed 12 times in a row, including cold starts (one unexplained failure once) |
| Real tesseract `est` on a generated page photo | paragraphs, hyphen join, page number dropped |
| 4-page flow, ElevenLabs mocked | 2 chunks, play + prefetch next, `previous_text`/`next_text` set, MP3 = both chunks |
| Replay | served from IndexedDB, no new request |
| Long-press → delete, reload | page gone, text and position persist |
| Service worker | caches the app shell; offline reload works |
| CORS preflight to api.elevenlabs.io | `access-control-allow-origin: *` on success and on errors |

## Not verified yet (please test)
1. **A real ElevenLabs call.** `.env` holds the API key *ID*, not the key, so the API
   refused it. Put a key starting with `sk_` in ⚙ (or `.env`) and play one page.
   Confirm `eleven_v4` is listed by `GET /v1/models`, then listen: Estonian, voice Emppu,
   `[whispers]` performed and not read out.
2. **A real phone**, especially iOS Safari: camera capture, long-press menu,
   tap-to-edit caret position (`caretRangeFromPoint`), `contenteditable="plaintext-only"`.
3. **GitHub Pages deploy.** The repo is private, so Pages needs GitHub Pro (or make the
   repo public). Then set Settings → Pages → Source: GitHub Actions.

## Phone test script (photo → MP3)
1. Open the site → Add to Home screen → open it from the icon.
2. ⚙ → paste key → Close.
3. + pages → photograph 3 pages, one at a time. Press ▶ while page 3 is still reading.
4. Tap a sentence on page 2 → playback jumps there. Type ` [sighs]` → tap outside.
   The tag turns grey and only that chunk is regenerated.
5. ⏮ ⏭ → moves by chunk; the highlight follows and the page scrolls.
6. Long-press page 1 → Retake → new photo replaces the text.
7. Close the app fully, reopen → same pages, same position.
8. ⚙ → Download MP3 → plays start to end. The "not generated yet" count makes sense.
9. Airplane mode → the app still opens; OCR still works (after one online run).
10. A wrong key or used-up quota → the error appears in plain words above the bar.

## Where to look hardest in review
- `src/chunk.ts`: a chunk ends at the first real paragraph end after 800 chars (max 1500).
  The point is that an edit re-synthesizes only nearby chunks. Is the
  page-break glue (a sentence or a hyphenated word cut by a page break) right?
- `src/player.ts`: `token` cancels stale plays; `loadedKey` decides resume vs regenerate
  after an edit. Check rapid ⏮/⏭/tap sequences.
- `src/stack.ts` + `src/render.ts`: tap = jump and edit. Cards are reconciled by `rev`,
  so an open edit survives OCR progress on other pages. Redraws only when an
  edit changes the sentence count.
- `src/clean.ts`: heuristics. A short line ending a sentence = paragraph end. A split
  word is joined only if the full word appears elsewhere and one piece never appears alone.
- `src/tts.ts`: sends the whole neighbouring chunk as `previous_text`/`next_text`. The
  TTS docs give no max length for these (text-to-dialogue caps them at 100).
- `public/sw.js`: bump `CACHE` if caching rules change.

## Known limits / decisions
- **Auto-tag:** skipped. ElevenLabs has no public API for it.
- **Paragraph detection depends on what tesseract gives.** In the test photo, two
  paragraphs on page 2 merged into one. Harmless for audio (it chunks by length), but
  visible.
- **Cache key = text + settings, without neighbours.** So two identical chunks share
  one MP3, and an edit never regenerates its neighbours.
- **MP3 download** is the cached MP3s joined end to end (no re-encoding).
- `src/book.ts` (106 lines) and `src/player.ts` (104) are just over the ~100-line guide.
