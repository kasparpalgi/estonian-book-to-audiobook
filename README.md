Build a tiny personal PWA: "photograph Estonian book pages → hear them read by ElevenLabs".
No backend, no database. Plain Vite + TypeScript, no UI framework.
Files under ~100 lines each, one job per file. Simplicity over features.

## EXACT ElevenLabs settings (copied from my ElevenLabs Text-to-Speech page; must match 1:1)
- voice_id: 4aEwu7MlAcY3VhYhcoDz   ("Emppu - Deep Finnish Narrator")
- model: "Eleven v4" (NOT v4 Turbo, NOT multilingual v2). Probably model_id "eleven_v4".
  Confirm with GET /v1/models before coding and use the exact id.
- language_code: "et"
- voice_settings: stability 0.5, similarity_boost 0.75
- UI "Clone strength" = 0%: find the matching API parameter in the current docs and set it
  to its 0 / off value. If no API parameter exists, leave it unset.
- No audio effects.
- output_format: mp3_44100_128
- Text is sent with its audio tags ([whispers], [sighs], etc.) unchanged. Eleven v4 performs them.
Put these in one config.ts as defaults. The ⚙ panel only stores the API key, so I can't
accidentally drift from these settings.
Use Context7 / the current ElevenLabs API docs for every parameter. Don't guess.

## Screen (one screen, mobile-first, minimal)
- Background: the text stack. One plain card per photographed page, in order, scrollable.
  Small page number + cleaned text, readable serif font, generous line height, no other chrome.
- Foreground: slim player bar pinned to the bottom (play/pause, prev/next chunk), a floating
  "+ pages" button and a small ⚙ button (API key, character count of the book, Download MP3).
- The chunk being read is softly highlighted, and the stack auto-scrolls to it.
- Tap a sentence → editable inline (contenteditable), saved on blur. I can type audio tags
  like [whispers] by hand. Tags are shown in a muted color.
- Long-press a page card → retake or delete that page.

## Flow
1. "+ pages": <input type="file" accept="image/*" capture="environment" multiple>.
   Pages can be added any time, even while playing.
2. OCR on-device with tesseract.js, language "est". Card shows progress until done.
3. Clean text in plain JS: join words hyphenated across line breaks, join lines into
   paragraphs, drop lines that are only a page number, fix spaced-out words like
   "kirjel danud" only when an obvious join exists. Faint dotted underline on
   low-confidence words.
4. Auto-tag: check whether ElevenLabs has an API for the "Auto-tag" feature from its
   Text-to-Speech UI. If yes, add an "Auto-tag" button per page that runs it on the
   page text, shows the result in the stack, and lets me edit it. If no, skip this
   (I'll add tags by hand) and tell me.
5. TTS: call the ElevenLabs REST endpoint directly from the browser with fetch.
   First verify CORS works from a browser origin. If it doesn't, stop and tell me
   instead of adding a server.
   - Chunk at paragraph boundaries, under the model's per-request character limit
     (aim ~800–1500 chars). Use previous_text/next_text only if v4 supports them.
   - Play chunks in sequence with one <audio>, prefetch only the NEXT chunk.
   - Cache each chunk's MP3 in IndexedDB keyed by hash(text + all settings above).
     Replays are free, and an edit re-synthesizes only the changed chunk.
   - Show ElevenLabs errors plainly (quota, plan doesn't allow this voice/API).
   - Tap a sentence (not editing) → jump there.
6. "Download MP3": concatenate cached chunk MP3s in order (say how many aren't generated yet).
7. Persist pages, text, edits and reading position in IndexedDB so I can resume.

## PWA
- manifest + simple service worker caching the app shell and the tesseract "est" model.
- Deploy to GitHub Pages via GitHub Actions (vite base path set correctly).

## Tests
- Unit tests: hyphen joining, paragraph cleanup, chunking under the limit, cache key,
  and a snapshot test that the TTS request body equals the exact settings above.
- One Playwright test: add page → text appears → edit a sentence → play, with tesseract
  and the ElevenLabs fetch mocked.

Don't add anything I didn't ask for.