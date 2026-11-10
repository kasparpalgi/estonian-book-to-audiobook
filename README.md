# Book → audio

Photograph Estonian book pages and hear them read aloud by ElevenLabs
(voice "Emppu", model Eleven v4). Runs entirely on your phone. No server.

## How to use: photo → MP3

1. **Open** https://kasparpalgi.github.io/estonian-book-to-audiobook/ on your phone,
   then *Add to Home screen*.
2. **⚙** → paste your ElevenLabs API key → **Close**.
   (Make one in your ElevenLabs account under *API Keys*. It needs Text to Speech access.)
3. **+ pages** → photograph a page. The card shows *Reading text… %* until it's done.
   Add more pages any time, even while it's playing.
4. **▶** to listen. **⏮ ⏭** go to the previous/next chunk.
5. **Tap a sentence** to start reading from there, and to fix its text.
   Type, then tap anywhere else to save. You can type tags like `[whispers]` or `[sighs]`.
6. **Long-press a page** → *Retake page* or *Delete page*.
7. **⚙ → Download MP3** saves the whole book as one file.
8. **⚙ → Start a new book** deletes all pages and their audio (the API key stays).
   If some parts haven't been played yet, it tells you how many are missing.

Good to know:
- A dotted underline means the OCR wasn't sure about that word. Check those first.
- Grey `[tags]` tell the voice *how* to speak. They aren't read out.
- Audio you've already heard is saved, so replays cost nothing. Editing a sentence
  only regenerates that part.
- ⚙ shows the book's character count, which is roughly what ElevenLabs charges.
- Your pages, edits and reading position are saved on the phone. Close the app any
  time and it picks up where you left off.
- Errors from ElevenLabs (quota used up, plan doesn't allow this voice) show above
  the play bar. "API key ID used as API key" means you pasted the key's ID: use the
  key itself, which starts with `sk_`.

## One-time setup (publishing the site)

1. GitHub → repo **Settings → Pages → Source: GitHub Actions**.
   The repo is private, and Pages on a private repo needs GitHub Pro. Otherwise make
   the repo public. There are no secrets in it: your API key only lives on your phone.
2. Push to `master`. The workflow tests, builds and deploys on every push.

## Developing

```sh
npm install
npx playwright install chromium   # first time only
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run e2e        # browser test (OCR + ElevenLabs mocked)
npm run build
```

- `HANDOVER.md` is the code-review and test checklist.
- `SPEC.md` is what the app must do. `AGENTS.md` is the guide for AI coding agents
  (Claude Code reads it through `CLAUDE.md`).
- The ElevenLabs settings are fixed in `src/config.ts` and can't be changed in the app.
- ElevenLabs' "Auto-tag" button has no public API, so it isn't in the app. Add tags by hand.
