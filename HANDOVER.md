# Handover: make OCR as good as Google Lens

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

## Decision for the user (ask before building)
SPEC.md says OCR is **on-device with tesseract.js**. Matching Lens probably means
sending photos to a cloud service. That changes the spec, so the user must choose:

| Option | Quality | Cost / privacy | Offline |
|---|---|---|---|
| A. Tune tesseract (preprocess, `tessdata_best`, PSM) | better, likely still below Lens on curved phone photos | free, on-device | yes |
| B. Google Cloud Vision `DOCUMENT_TEXT_DETECTION` | the same engine family as Lens | paid after a free tier (**verify current pricing**), photo goes to Google | no |
| C. A vision LLM (Gemini or Claude) transcribes the page | likely best at reading order, hyphens, paragraphs | per-call cost, photo goes to the provider; risk of "fixing" the author's words | no |

Verified today: `vision.googleapis.com` and `generativelanguage.googleapis.com` both answer
the CORS preflight from `https://kasparpalgi.github.io` (allow-origin echoed,
`content-type,x-goog-api-key` allowed). So B or C works from the browser with a key in ⚙,
like ElevenLabs. No backend needed.
**Recommendation:** B, with tesseract kept as the offline fallback only if the user wants
offline OCR. Then update SPEC.md and README.md, and add the key field to ⚙.
Check pricing, `languageHints: ["et"]` and the response shape in the current docs
(Context7) first. Don't guess.

## How to measure (do this before changing anything)
1. Write a throwaway script (not committed) that runs real OCR on `samples/*.jpg` in Chromium
   through the dev server and prints the cleaned text. This one worked for testing the EXIF
   fix: start `npx vite --port 5180`, Playwright `setInputFiles('#file', photo)`, wait for
   `.card .s`, print `.card` text.
2. Compare with `samples/page1.lens.txt`: word error rate (word-level Levenshtein), plus a
   diff by eye of hyphens, paragraphs and quotes.
3. Try each option on the same photo, report the numbers, then build the winner.

## Ideas to try for option A (tesseract), cheapest first
- `langPath` → `tessdata_best` for `est` (tesseract.js 7.0.0 defaults to `4.0.0_best_int`
  for OEM 1). Check that the URL exists and the service worker still caches it.
- Preprocess in `src/upright.ts`: grayscale + contrast stretch; maybe an adaptive threshold.
- `tessedit_pageseg_mode` (3 = auto vs 4 = single column, 6 = single block).
- Set `user_defined_dpi` (~300) so tesseract doesn't guess the DPI.
- Try the size cap: 3000 px vs the full photo (text height matters, ~30 px x-height is ideal).
- A crop/dewarp of a curved page is probably too much code for this app's simplicity rule.

## Text-cleanup issues spotted (independent of which OCR wins)
- **Estonian closing quote.** Estonian dialogue is „…“: the closing quote is U+201C `“`.
  `TERMINAL` and the sentence splitter in `src/sentences.ts` only know `"»”’)`, so
  `„Tere.“ Next` is not split and does not count as a paragraph end. Add `“` (and test).
- **Title lines** ("Kuidas Jaan Viinakuradiga tookord") have no terminal punctuation, so they
  get glued onto the first paragraph. Probably: a short line followed by a blank line = its
  own paragraph.
- `joinSplitWords` (in `src/clean.ts`) needs only one rare piece, so a rare word + a common
  clitic ("ka", "ki", "gi", "ju") can merge wrongly ("maja ka" → "majaka" if "majaka"
  appears elsewhere).
- If the OCR engine already joins lines (Vision/LLM do), `cleanText` must not mangle
  its output. Keep the hyphen-join and page-number rules and run them on the raw lines.

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
All 18 unit tests, the Playwright test and the build pass.
