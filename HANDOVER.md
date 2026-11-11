# Handover: OCR as good as Google Lens (Google Vision built; check on a real photo)

**Goal of the next session:** a photographed Estonian book page comes out as text that is
as good as Google Lens gives (ideally better), so ElevenLabs reads it without nonsense.
**Rules:** `AGENTS.md`. **Spec:** `SPEC.md`. **User guide:** `README.md`.

## Where things stand (2026-11-11)
- Live: https://kasparpalgi.github.io/estonian-book-to-audiobook/ (repo is public now).
- Deploy: **every push to `master` deploys** through `.github/workflows/deploy.yml`
  (test → build → Pages). Pages source = GitHub Actions. `app-v1` and `master` are pushed
  and equal.

## The problem
- First phone photo: **pure gibberish.** Cause: tesseract.js only applies EXIF orientation
  when it is stored big-endian (it regex-matches bytes `1 18 0 3 0 0 0 1 0 X` in the first
  500 bytes). Many Android phones store it little-endian, so the page was OCR'd sideways.
  **Fixed:** `src/upright.ts` redraws the photo through `<img>` + canvas (browsers apply
  every EXIF flag) and caps the long side at 3000 px. On a generated sideways 12 MP photo,
  real OCR in Chromium is now word-perfect.
- After the fix: **the user can read the text, but it is "far from what Google Lens gives".**
  We don't have the user's tesseract output or the photo yet.

## Material
- `samples/page1.lens.txt`: Google Lens text of the user's page (reference text).
  `samples/` is **gitignored on purpose**: it is copyrighted book text, the repo is public.
  Never commit it.
- **Ask the user first** to put the original photo(s) in `samples/`
  (e.g. `samples/page1.jpg`), not a screenshot. Also ask what the app showed for that page.
- Lens is not perfect either. In the last paragraph it mixed up the line order:
  "…(Jaani võimas habe - välimuse poolest võiks teda vabalt näiteks keskaegseks on ikka
  julgesti üle saja kilo) ja mungaks…" should read
  "(Jaani võimas habe - on ikka julgesti üle saja kilo) ja välimuse poolest võiks teda
  vabalt näiteks keskaegseks mungaks…". Don't treat the Lens text as 100 % true.
- Things in this page the cleanup must handle: a title line, dialogue in „…" quotes, a
  "tas-kust" hyphen at a line end, "kirjel danud" (the split-word case from SPEC.md),
  "kaja-ka" (a real hyphen, keep it), "Kutsuja-Viinakurat..", "nii" + colon-less quote.

## Decided and built: Google Cloud Vision (option B)
The user chose Google ("integrate google lens"). Google Lens has no API, so it's
**Cloud Vision `DOCUMENT_TEXT_DETECTION`** (`src/vision.ts`), key in ⚙ (`kv.visionKey`).
No key, or offline (fetch throws) → tesseract as before. Google errors show on the card.
Tested with Google's response mocked (Playwright, not committed): the request carries the key
header, `DOCUMENT_TEXT_DETECTION`, `languageHints: ["et"]`, a base64 JPEG; text comes out
right; a 403 billing error shows on the card; offline falls back to tesseract.
**Not tested with the real API yet**: no key and no photo. Pricing is not verified
(the pricing page is JS-only). README tells the user how to make and restrict the key.

## Next session: check quality on the real photo
1. Ask for the real photo in `samples/` and confirm the user has a Vision key in ⚙ that works.
   Or ask the user to run one real page on the phone and paste the app's text.
2. Compare with `samples/page1.lens.txt`: word error rate (word-level Levenshtein), plus a
   diff by eye of hyphens, paragraphs and quotes.
3. To run the real API locally: a throwaway Playwright script against `npx vite --port 5180`,
   fill `#gkey`, `setInputFiles('#file', photo)`, wait for `.card .s`, print `.card`.
   Never commit the key or the photo.
4. Unverified assumption: Vision's `HYPHEN` break means the "-" is *not* a symbol. The code
   handles both cases (adds "-" only if the text doesn't already end with one). Check on
   a real hyphenated line ("tas-kust").
5. If tesseract should improve too (offline fallback), ideas, cheapest first:
   `tessdata_best` langPath, grayscale/contrast in `upright.ts`, PSM 4/6, `user_defined_dpi`.

## Text-cleanup issues spotted (independent of which OCR wins)
- ~~Estonian closing quote `“`~~: **fixed** in `src/sentences.ts`, with a test.
- **Running headers** (book or chapter title at the top of every page) will be read
  aloud. Vision usually returns them as their own short block. Maybe drop a first
  paragraph that repeats on several pages.
- **Title lines** ("Kuidas Jaan Viinakuradiga tookord") have no terminal punctuation, so they
  get glued onto the first paragraph. Probably: a short line followed by a blank line = its
  own paragraph.
- `joinSplitWords` (in `src/clean.ts`) needs only one rare piece, so a rare word + a common
  clitic ("ka", "ki", "gi", "ju") can merge wrongly ("maja ka" → "majaka" if "majaka"
  appears elsewhere).
- `vision.ts` rebuilds the raw lines (`\n`) and Vision paragraphs (blank line) from the
  symbol breaks, so `cleanText` runs the same rules as for tesseract.

## Still open from the code review (lower priority)
- iOS: the first ▶ may be blocked, because `audio.play()` runs after an `await`
  (fix: unlock the `<audio>` synchronously in the tap). Retake was changed to open the
  camera inside the tap. Needs a real iPhone.
- Deleting the page being read sends playback back to the start of the book.
- Tapping a sentence while playing jumps to its chunk's start, not the sentence.
- Download MP3: check that players show the full length of the joined file
  (needs real ElevenLabs MP3s).
- Real ElevenLabs call not done yet: needs a key starting with `sk_`
  (the `.env` holds a key ID, not a key).
- `src/player.ts` is 118 lines, `src/book.ts` 114 (guide: ~100). Worth a split.

## Done in the last session (for context)
Review fixes, committed on `app-v1`: a page added while the last chunk plays is no longer
skipped (`player.ts`); an edit that moves a sentence boundary now redraws (`book.ts`);
retake opens the camera inside the tap (`main.ts`); the offline app shell refreshes on
each online visit (`sw.js`); photos turned upright before OCR (`upright.ts`);
**⚙ → Start a new book** (user request; added to SPEC.md and README.md) deletes all pages,
their audio and the reading position, but keeps the key.
**Auto-update** (`update.ts`): on open / return to the app it reloads to the newest
deployed version unless playing or editing; ⚙ → Reload app forces it. `sw.js` lets
`cache: 'no-store'` requests through to the network for this check.
All 18 unit tests, the Playwright test and the build pass.
