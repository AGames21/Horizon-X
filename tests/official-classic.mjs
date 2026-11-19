import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

try {
  const page = await browser.newPage()
  const response = await page.goto('https://classic.minecraft.net/', { waitUntil: 'domcontentloaded' })
  assert.equal(response?.ok(), true)
  assert.match(await page.title(), /Minecraft Classic/i)
  await page.locator('canvas').first().waitFor({ state: 'attached', timeout: 30000 })
  console.log('Mojang’s official Minecraft Classic page loaded its game canvas.')
} finally {
  await browser.close()
}
