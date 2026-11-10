import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5179', browserName: 'chromium' },
  webServer: { command: 'npx vite --mode e2e --port 5179 --strictPort', url: 'http://localhost:5179', reuseExistingServer: true },
})
