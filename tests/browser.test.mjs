import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import http from 'node:http'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

let site, browser, client, base

before(async () => {
  site = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  base = 'http://127.0.0.1:' + site.httpServer.address().port
  client = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html')
    response.end('<title>Launch test endpoint</title><h1>' + request.url + '</h1>')
  })
  await new Promise(resolve => client.listen(0, '127.0.0.1', resolve))
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
})

after(async () => {
  await browser?.close()
  await site?.close()
  if (client) await new Promise(resolve => client.close(resolve))
})

test('launcher validates, persists and opens configured URLs', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const banner = page.waitForResponse(response => /horizon-banner-.+\.webp/.test(response.url()))
  await page.goto(base + '/')
  assert.equal((await banner).status(), 200)
  await page.getByText('WASM available').waitFor()
  await page.getByText(/WebGPU (available|unavailable)/).waitFor()
  await page.getByText(/WebGL (available|unavailable)/).waitFor()
  await page.getByRole('link', { name: 'Choose a mode' }).click()
  assert.equal(await page.evaluate(() => document.activeElement.id), 'game-modes')
  await page.getByRole('link', { name: 'Set up Modern', exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: /Set up (Modern|Classic)/ }).count(), 2)
  await page.getByRole('link', { name: 'Set up Modern' }).click()
  const modern = page.getByLabel('Modern client URL')
  await page.getByRole('button', { name: 'Use local Horizon Web address' }).click()
  assert.equal(await modern.inputValue(), 'http://localhost:8080/')
  const classic = page.getByLabel('Classic client URL')
  await modern.fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Save client addresses' }).click()
  assert.match(await page.getByRole('status').textContent(), /Use an HTTPS/)
  const origin = 'http://127.0.0.1:' + client.address().port
  await modern.fill(origin + '/modern?args=preserved')
  await classic.fill(origin + '/classic')
  await page.getByRole('button', { name: 'Save client addresses' }).click()
  await page.getByText('Client addresses saved.').waitFor()
  await page.reload()
  assert.equal(await modern.inputValue(), origin + '/modern?args=preserved')
  assert.equal(await classic.inputValue(), origin + '/classic')
  await page.getByRole('navigation').getByRole('link', { name: 'Play', exact: true }).click()
  for (const [name, path] of [['Modern', '/modern?args=preserved'], ['Classic', '/classic']]) {
    const [newTab] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: 'Launch ' + name }).click()])
    await newTab.getByRole('heading', { name: path, exact: true }).waitFor()
    assert.equal(newTab.url(), origin + path)
    assert.equal(await newTab.evaluate(() => window.opener), null)
    await newTab.close()
  }
  for (const [link, heading] of [['Multiplayer', 'Multiplayer'], ['About', 'About Horizon X'], ['Settings', 'Settings']]) {
    await page.getByRole('navigation').getByRole('link', { name: link, exact: true }).click()
    await page.getByRole('heading', { name: heading, exact: true }).waitFor()
  }
  await modern.fill('')
  await classic.fill('')
  await page.getByRole('button', { name: 'Save client addresses' }).click()
  await page.getByRole('navigation').getByRole('link', { name: 'Play', exact: true }).click()
  await page.getByRole('link', { name: 'Set up Modern', exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: /Set up (Modern|Classic)/ }).count(), 2)
  await page.setViewportSize({ width: 360, height: 740 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 360)
  assert.deepEqual(errors, [])
  await page.close()
})

test('preferences and server management persist and launch with Horizon arguments', async () => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/#settings')
  const clientOrigin = 'http://127.0.0.1:' + client.address().port
  await page.getByLabel('Modern client URL').fill(clientOrigin + '/modern?cli=preserve')
  await page.getByLabel('Classic client URL').fill(clientOrigin + '/classic')
  await page.getByRole('button', { name: 'Save client addresses' }).click()
  await page.getByLabel('Theme', { exact: true }).selectOption('light')
  await page.getByLabel('Preferred mode').selectOption('classic')
  await page.getByLabel('Graphics preset').selectOption('performance')
  await page.getByLabel('Render distance (chunks)').fill('8')
  await page.getByLabel('Enable Horizon Web launch arguments').check()
  await page.getByLabel('Offline player name').fill('HorizonTester')
  await page.getByLabel('Show Horizon Web performance overlay').check()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await page.getByText('Launcher preferences saved.').waitFor()
  await page.reload()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light')
  assert.equal(await page.getByLabel('Graphics preset').inputValue(), 'performance')
  assert.equal(await page.getByLabel('Render distance (chunks)').inputValue(), '8')
  assert.equal(await page.getByLabel('Enable Horizon Web launch arguments').isChecked(), true)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export preferences' }).click()])
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'))
  assert.equal(exported.version, 1)
  assert.equal(exported.theme, 'light')
  const input = page.getByLabel('Import preferences')
  const importData = data => input.setInputFiles({ name: 'settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) })
  await importData({ ...exported, distance: 500 })
  await page.getByText('Could not import this Horizon X preferences file.').waitFor()
  await importData({ ...exported, theme: 'dark' })
  await page.getByText('Launcher preferences saved.').waitFor()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  const fullscreen = page.getByRole('button', { name: 'Toggle launcher fullscreen' })
  await fullscreen.click()
  await page.waitForFunction(() => !!document.fullscreenElement)
  await fullscreen.click()
  await page.waitForFunction(() => !document.fullscreenElement)

  await page.getByRole('navigation').getByRole('link', { name: 'Play', exact: true }).click()
  await page.getByRole('heading', { name: 'Game modes' }).waitFor()
  assert.equal(await page.locator('.mode-card h3').first().textContent(), 'Classic Mode')
  await page.getByRole('link', { name: 'Multiplayer', exact: true }).click()
  await page.getByRole('heading', { name: 'Saved servers' }).waitFor()
  const save = page.getByRole('button', { name: 'Save server' })
  const name = page.getByLabel('Server name')
  const address = page.getByLabel('WebSocket address')
  const mode = page.getByLabel('Client', { exact: true })
  await name.fill('Classic lobby')
  await address.fill('https://not-a-websocket.example/')
  await save.click()
  await page.getByText('Enter a ws:// or wss:// server address', { exact: false }).waitFor()
  await address.fill('wss://classic.example/')
  await save.click()
  await page.getByText('Server added.').waitFor()
  await name.fill('Modern lobby')
  await address.fill('wss://modern.example/play')
  await mode.selectOption('modern')
  await save.click()
  const modern = page.locator('.server-row').filter({ hasText: 'Modern lobby' })
  await modern.getByRole('button', { name: 'Favorite' }).click()
  await page.reload()
  assert.equal(await page.locator('.server-row h3').first().textContent(), 'Modern lobby')
  assert.equal(await modern.getByRole('button', { name: 'Favorite' }).getAttribute('aria-pressed'), 'true')
  await modern.getByRole('button', { name: 'Edit' }).click()
  await address.fill('wss://modern.example/new?shard=1')
  await save.click()
  await page.getByText('Server updated.').waitFor()
  const [joined] = await Promise.all([page.waitForEvent('popup'), modern.getByRole('link', { name: 'Join in Horizon Web' }).click()])
  await joined.waitForLoadState()
  const joinedUrl = new URL(joined.url())
  assert.equal(joinedUrl.searchParams.get('args'), '--server wss://modern.example/new?shard=1 --name HorizonTester')
  assert.equal(joinedUrl.searchParams.get('horizonXHud'), '1')
  assert.equal(joinedUrl.searchParams.get('cli'), 'preserve')
  assert.equal(joinedUrl.pathname, '/modern')
  await joined.close()
  const classic = page.locator('.server-row').filter({ hasText: 'Classic lobby' })
  assert.equal(await classic.getByRole('link', { name: 'Open client' }).getAttribute('href'), clientOrigin + '/classic')
  await modern.getByRole('button', { name: 'Delete' }).click()
  await page.reload()
  assert.equal(await modern.count(), 0)
  assert.equal(await classic.count(), 1)
  await page.setViewportSize({ width: 360, height: 750 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 360)
  assert.deepEqual(errors, [])
  await page.close()
})

test('private overlay displays only available engine measurements', async () => {
  const page = await browser.newPage()
  try {
    await page.goto(base + '/?horizonXHud=1')
    await page.addScriptTag({ path: 'scripts/horizon-hud.js', type: 'module' })
    const hud = page.locator('#horizon-x-hud')
    await hud.waitFor({ state: 'attached' })
    assert.equal(await hud.isVisible(), false)
    // A fixture for the published Horizon status API. This does not run the game.
    await page.evaluate(() => {
      globalThis.horizon = {
        horizon_status: () => JSON.stringify({ frames: 45, fps: 57, cpu_ms: 3.25, gpu_ms: null }),
      }
    })
    await page.getByText('57 FPS · 3.3 ms CPU', { exact: true }).waitFor()
    await hud.waitFor({ state: 'hidden', timeout: 6000 })
  } finally {
    await page.close()
  }
})
