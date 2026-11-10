// Stand-in for tesseract.js in the Playwright test (vite --mode e2e).
export const MOCK_TEXT = 'Esimene lause on siin. Teine lause tuleb kohe.\n\n- 5 -\n'

export async function createWorker(_lang: string, _oem: number, options?: { logger?: (m: object) => void }) {
  return {
    async recognize() {
      options?.logger?.({ status: 'recognizing text', progress: 0.5 })
      await new Promise((r) => setTimeout(r, 300))
      return { data: { text: MOCK_TEXT, blocks: [] } }
    },
  }
}
export type Worker = Awaited<ReturnType<typeof createWorker>>
