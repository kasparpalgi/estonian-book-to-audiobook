# Agent instructions

Personal PWA: photograph Estonian book pages → OCR on-device → read aloud by ElevenLabs.
`SPEC.md` is the source of truth for what to build. `README.md` is the user guide.

## Rules
- Simplicity over features. **Don't add anything SPEC.md doesn't ask for.**
- Plain Vite + TypeScript, no UI framework, no backend, no database server.
- Files under ~100 lines each, one job per file.
- ElevenLabs settings live only in `src/config.ts` and must match SPEC.md 1:1.
  Never make them user-editable. The ⚙ panel stores only the API key.
- Look up ElevenLabs / tesseract.js parameters in current docs (Context7). Don't guess.

## Commands
- `npm install`: install deps (first time also `npx playwright install chromium`)
- `npm run dev`: local dev server
- `npm test`: unit tests (vitest)
- `npm run e2e`: Playwright test (tesseract + ElevenLabs mocked)
- `npm run build`: production build to `dist/` (base `/estonian-book-to-audiobook/`)
- If the TTS request body changes, `npm test -- -u` updates the snapshot. Only do this
  when SPEC.md settings changed on purpose.

## Map
| File | Job |
|---|---|
| `src/config.ts` | ElevenLabs settings + chunk sizes |
| `src/clean.ts` | OCR text cleanup (hyphens, paragraphs, page numbers, split words) |
| `src/sentences.ts` | split paragraphs into sentences, join back |
| `src/chunk.ts` | pack sentences into TTS chunks at paragraph boundaries |
| `src/hash.ts` | cache key = sha256(text + settings) |
| `src/tts.ts` | ElevenLabs request body + fetch + readable errors |
| `src/db.ts` | tiny IndexedDB wrapper (pages, audio, kv) |
| `src/ocr.ts` | tesseract.js "est" queue with progress |
| `src/upright.ts` | turn phone photos upright (EXIF) + cap size before OCR |
| `src/book.ts` | app state: pages, add/edit/delete, persistence |
| `src/render.ts` | draw page cards + sentences |
| `src/stack.ts` | card interactions: tap/edit/long-press |
| `src/player.ts` | one `<audio>`, play chunks in order, prefetch next |
| `src/settings.ts` | ⚙ panel: API key, char count, Download MP3 |
| `src/main.ts` | wiring |
| `src/update.ts` | reload to the newest deployed version when the app is opened |
| `public/sw.js` | service worker: app shell + tesseract model cache |

## Verified facts (2026-11-11)
- Model id `eleven_v4`, limit 10,000 chars/request, supports `language_code: "et"`.
- "Clone strength" = `voice_settings.clone_strength` (0–1). Only affects PVCs. We send 0.
- `previous_text` / `next_text` are supported on v4 (stitching is only unsupported on v3).
- `output_format` is a query parameter on `POST /v1/text-to-speech/{voice_id}`.
- CORS: api.elevenlabs.io answers preflight with `access-control-allow-origin: *`.
- No public API for the UI's "Auto-tag" feature, so it's not built.
