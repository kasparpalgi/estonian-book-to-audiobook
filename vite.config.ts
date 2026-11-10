import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command, mode, isPreview }) => ({
  // GitHub Pages serves the app from /<repo>/
  base: command === 'build' || isPreview ? '/estonian-book-to-audiobook/' : '/',
  resolve: {
    // The Playwright test swaps tesseract for a mock (vite --mode e2e).
    alias: mode === 'e2e' ? [{ find: 'tesseract.js', replacement: fileURLToPath(new URL('./e2e/tesseract-mock.ts', import.meta.url)) }] : [],
  },
  test: { include: ['tests/**/*.test.ts'] },
}))
