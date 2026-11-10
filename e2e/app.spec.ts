import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const silence = readFileSync(new URL('./silence.mp3', import.meta.url))

test('add page → text appears → edit a sentence → play', async ({ page }) => {
  const bodies: { text: string }[] = []
  await page.route('https://api.elevenlabs.io/**', async (route) => {
    bodies.push(route.request().postDataJSON())
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: silence })
  })
  await page.goto('/')

  await page.click('#gear')
  await page.fill('#key', 'test-key')
  await page.press('#key', 'Enter')

  await page.setInputFiles('#file', 'public/icon-192.png') // any real image; OCR is mocked
  const second = page.locator('.s', { hasText: 'Teine lause' })
  await expect(second).toBeVisible()
  await expect(page.locator('.card')).not.toContainText('5 -')

  await second.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Teine lause [whispers] on muudetud.')
  await page.keyboard.press('Enter')
  await expect(page.locator('.tag')).toHaveText('[whispers]')

  await page.click('#play')
  await expect(page.locator('#play')).toHaveAttribute('aria-label', 'Pause')
  await expect(page.locator('.s.reading')).toHaveCount(2)
  expect(bodies[0].text).toBe('Esimene lause on siin. Teine lause [whispers] on muudetud.')
})
