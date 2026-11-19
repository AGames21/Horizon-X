export type Mode = 'modern' | 'classic'
type Theme = 'dark' | 'light'
type Preset = 'performance' | 'balanced' | 'quality'

const key = 'horizon-x.preferences.v1'
const defaults = {
  theme: 'dark' as Theme,
  mode: 'modern' as Mode,
  preset: 'balanced' as Preset,
  distance: 12,
  horizonArgs: false,
}
type Preferences = typeof defaults

function validate(value: unknown): Preferences {
  if (value === null || typeof value !== 'object') throw new Error('Invalid launcher settings.')
  const data = value as Record<string, unknown>
  if (
    (data.theme !== 'dark' && data.theme !== 'light') ||
    (data.mode !== 'modern' && data.mode !== 'classic') ||
    (data.preset !== 'performance' && data.preset !== 'balanced' && data.preset !== 'quality') ||
    typeof data.distance !== 'number' || !Number.isInteger(data.distance) || data.distance < 2 || data.distance > 32 ||
    typeof data.horizonArgs !== 'boolean'
  ) throw new Error('Invalid launcher settings.')
  return { theme: data.theme, mode: data.mode, preset: data.preset, distance: data.distance, horizonArgs: data.horizonArgs }
}

function read(): Preferences {
  try { return validate(JSON.parse(localStorage.getItem(key) ?? 'null')) }
  catch { return { ...defaults } }
}

export let preferences = read()

function apply(next: Preferences) {
  preferences = next
  document.documentElement.dataset.theme = next.theme
  try {
    localStorage.setItem(key, JSON.stringify(next))
    return true
  } catch { return false }
}

document.documentElement.dataset.theme = preferences.theme

export function preferencePanel() {
  return `<form id="preference-form" class="panel">
    <h2>Launcher preferences</h2>
    <div class="field-grid">
      <div><label for="preference-theme">Theme</label><select id="preference-theme" name="theme"><option value="dark">Dark</option><option value="light">Light</option></select></div>
      <div><label for="preference-mode">Preferred mode</label><select id="preference-mode" name="mode"><option value="modern">Modern</option><option value="classic">Classic</option></select></div>
      <div><label for="preference-preset">Graphics preset</label><select id="preference-preset" name="preset"><option value="performance">Performance</option><option value="balanced">Balanced</option><option value="quality">Quality</option></select></div>
      <div><label for="preference-distance">Render distance <span>(chunks)</span></label><input id="preference-distance" name="distance" type="number" min="2" max="32" step="1" required /></div>
    </div>
    <p>The preferred mode appears first on Play. Graphics and distance are saved here as reference for your in-game settings.</p>
    <label class="check-label"><input name="horizonArgs" type="checkbox" /> Enable Horizon Web quick connect</label>
    <p>Enable this for a Horizon Web build that accepts launch arguments. Leave it off for Astris and other clients.</p>
    <div class="button-row">
      <button class="button primary" type="submit">Save preferences</button>
      <button type="button" class="button secondary" id="fullscreen">Toggle launcher fullscreen</button>
      <button type="button" class="button secondary" id="export-settings">Export preferences</button>
      <label class="button secondary import-button">Import preferences<input id="import-settings" type="file" accept="application/json,.json" /></label>
    </div>
    <p id="preference-status" role="status"></p>
  </form>`
}

export function bindPreferences() {
  const form = document.querySelector<HTMLFormElement>('#preference-form')
  if (!form) return
  const status = form.querySelector<HTMLElement>('#preference-status')!
  const fullscreen = form.querySelector<HTMLButtonElement>('#fullscreen')!
  const fill = () => {
    for (const name of ['theme', 'mode', 'preset', 'distance'] as const) {
      const field = form.elements.namedItem(name) as HTMLSelectElement | HTMLInputElement
      field.value = String(preferences[name])
    }
    const quickConnect = form.elements.namedItem('horizonArgs') as HTMLInputElement
    quickConnect.checked = preferences.horizonArgs
  }
  const save = (next: Preferences) => {
    status.textContent = apply(next) ? 'Launcher preferences saved.' : 'Preferences applied for this tab. Browser storage is unavailable.'
    fill()
  }
  fill()
  form.addEventListener('submit', event => {
    event.preventDefault()
    const data = new FormData(form)
    try { save(validate({ ...Object.fromEntries(data), distance: Number(data.get('distance')), horizonArgs: data.has('horizonArgs') })) }
    catch (error) { status.textContent = (error as Error).message }
  })
  fullscreen.disabled = !document.fullscreenEnabled
  if (fullscreen.disabled) fullscreen.textContent = 'Launcher fullscreen unavailable'
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch { status.textContent = 'The browser could not change fullscreen mode.' }
  })
  form.querySelector('#export-settings')?.addEventListener('click', () => {
    const link = document.createElement('a')
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, ...preferences }, null, 2)], { type: 'application/json' }))
    link.href = url
    link.download = 'horizon-x-preferences.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
  form.querySelector<HTMLInputElement>('#import-settings')?.addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      if (file.size > 8192) throw new Error()
      const data = JSON.parse(await file.text())
      if (data?.version !== 1) throw new Error()
      save(validate(data))
    } catch { status.textContent = 'Could not import this Horizon X preferences file.' }
    finally { input.value = '' }
  })
}
