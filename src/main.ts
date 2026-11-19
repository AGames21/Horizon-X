import './style.css'

const shapes = {
  logo: '<path d="M3 19 10 5h4l-2.5 5 3 5 4.5-9h4l-7 14h-4l-3-5L7 19z" fill="currentColor" stroke="none"/>',
  play: '<path d="m9 5 12 7-12 7z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-3-12a4 4 0 0 1 0 8"/><circle cx="9" cy="7" r="4"/>',
  settings: '<path d="m10 2-.5 3-2 .9L5 4.5 2.5 9 5 11v2l-2.5 2L5 19.5 7.5 18l2 .9L10 22h4l.5-3.1 2-.9 2.5 1.5 2.5-4.5-2.5-2v-2l2.5-2L19 4.5 16.5 6l-2-.9L14 2z"/><circle cx="12" cy="12" r="3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  box: '<path d="m12 2 9 5v10l-9 5-9-5V7zm0 20V12m9-5-9 5-9-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  external: '<path d="M13 5h6v6m0-6-8 8m6 0v6H5V7h6"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
}
const icon = (name: keyof typeof shapes) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`

const pages = { play: 'Play', multiplayer: 'Multiplayer', settings: 'Settings', about: 'About' } as const
type Page = keyof typeof pages
type Mode = 'modern' | 'classic'
type Check = 'checking' | 'available' | 'unavailable'
const navIcons = { play: 'play', multiplayer: 'users', settings: 'settings', about: 'info' } as const
const modes = {
  modern: { name: 'Modern Mode', client: 'Horizon Web', version: 'Java 26.3', icon: 'box', renderer: 'WebGPU', description: 'Explore modern worlds with the Horizon Rust engine, powered by WebAssembly and WebGPU.' },
  classic: { name: 'Classic Mode', client: 'Eaglercraft', version: '1.8.8', icon: 'grid', renderer: 'WebGL', description: 'Connect to a compatible 1.8.8 browser client using a client address you provide.' },
} as const
const storageKey = 'horizon-x.clients.v1'
const urls: Record<Mode, string> = { modern: '', classic: '' }
const checks: Record<'gpu' | 'gl' | 'wasm', Check> = { gpu: 'checking', gl: 'checking', wasm: 'checking' }
const app = document.querySelector<HTMLDivElement>('#app')!

function clientUrl(input: string): string {
  const parsed = new URL(input)
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  if (parsed.username || parsed.password || (parsed.protocol !== 'https:' && !(loopback && parsed.protocol === 'http:'))) {
    throw new Error('Use an HTTPS client URL or an HTTP localhost URL, without credentials.')
  }
  return parsed.href
}

function loadUrls() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (!saved || typeof saved !== 'object') return
    for (const mode of ['modern', 'classic'] as const) {
      const value: unknown = (saved as Record<string, unknown>)[mode]
      if (typeof value === 'string' && value) {
        try { urls[mode] = clientUrl(value) } catch { /* Ignore invalid saved URLs. */ }
      }
    }
  } catch { /* The launcher remains usable without persistent storage. */ }
}

const currentPage = (): Page => {
  const hash = location.hash.slice(1)
  return Object.hasOwn(pages, hash) ? hash as Page : 'play'
}

const checkLabel = (value: Check) => ({ checking: 'Checking', available: 'Available', unavailable: 'Unavailable' })[value]
const indicator = (value: Check) => `<span class="dot ${value}"></span>`

function modeCard(mode: Mode) {
  const data = modes[mode]
  const configured = Boolean(urls[mode])
  return `<article class="mode-card ${mode}">
    <div class="card-top"><div class="mode-icon">${icon(data.icon)}</div><span class="version">${data.version}</span></div>
    <div class="mode-name"><h3>${data.name}</h3><span>${data.client}</span></div>
    <p>${data.description}</p>
    <div class="requirements" aria-label="Browser capabilities">
      <span data-check="${mode === 'modern' ? 'gpu' : 'gl'}"></span>
      ${mode === 'modern' ? '<span data-check="wasm"></span>' : ''}
    </div>
    <div class="card-bottom">
      ${configured ? `<a class="button launch" data-launch="${mode}" target="_blank" rel="noopener noreferrer">${icon('play')} Launch ${mode === 'modern' ? 'Modern' : 'Classic'} ${icon('external')}</a>` :
        `<a class="button launch" href="#settings">${icon('settings')} Set up ${mode === 'modern' ? 'Modern' : 'Classic'} ${icon('arrow')}</a>`}
      <span class="card-status">${configured ? 'Client configured · opens in a new tab' : 'Client URL required'}</span>
    </div>
  </article>`
}

function play() {
  return `<section class="hero">
    <div class="hero-content">
      <p class="eyebrow"><span></span> BROWSER GAME LAUNCHER</p>
      <h1>Horizon <em>X</em></h1>
      <p class="hero-copy">Your browser. Your worlds. Choose a client and jump in.</p>
      <a class="button hero-button" href="#play" data-modes>Choose a mode ${icon('arrow')}</a>
    </div>
  </section>
  <section class="mode-section" id="game-modes" tabindex="-1">
    <div class="section-header"><div><h2>Game modes</h2><p>Choose the client that fits your browser.</p></div></div>
    <div class="mode-grid">${modeCard('modern')}${modeCard('classic')}</div>
  </section>`
}

function settings() {
  return `<h1 class="page-title">Settings</h1><p class="page-intro">Configure the game clients available on this browser.</p>
    <form id="client-form" class="panel">
      <h2>Client addresses</h2>
      <label for="modern-url">Modern client URL</label>
      <input id="modern-url" name="modern" type="url" placeholder="http://localhost:8080/" aria-describedby="modern-help" />
      <p id="modern-help">Use a private Horizon Web build prepared from your own copy of Minecraft Java 26.3. Follow the <a href="https://github.com/nobuildersnotools/horizon-web/blob/web/web/README.md" target="_blank" rel="noopener noreferrer">Horizon Web build guide</a>, start its web server, then paste its address here.</p>
      <label for="classic-url">Classic client URL</label>
      <input id="classic-url" name="classic" type="url" placeholder="https://your-client.example/" aria-describedby="classic-help" />
      <p id="classic-help">Enter the address of a compatible 1.8.8 build you are authorized to use. Leave either field blank to clear it.</p>
      <button class="button primary" type="submit">Save client addresses</button><p id="form-status" role="status"></p>
    </form>`
}

const otherPages = {
  multiplayer: () => `<h1 class="page-title">Multiplayer</h1><p class="page-intro">Join from the client that supports your server.</p><div class="panel"><h2>Connect in game</h2><p>Launch Modern Mode and use the game’s Multiplayer menu for supported WebSocket servers. Use Join Shared World for a Horizon world share code. Classic server compatibility depends on your configured Classic client.</p><a class="button primary" href="#play">Choose a client ${icon('arrow')}</a></div>`,
  about: () => `<h1 class="page-title">About Horizon X</h1><p class="page-intro">An independent launcher for Minecraft-compatible browser clients.</p><div class="panel"><h2>Bring your own game files</h2><p>Modern Mode opens Horizon Web, a Rust and WebAssembly client. Prepare Java 26.3 resources from a copy you own and serve your build privately. Each launched client manages its own worlds, storage and controls.</p><p>Horizon X is unaffiliated with Mojang Studios or Microsoft.</p><a href="https://github.com/nobuildersnotools/horizon-web/tree/web" target="_blank" rel="noopener noreferrer">Horizon Web source ${icon('external')}</a></div>`,
}

function updateChecks() {
  const names = { gpu: 'WebGPU', gl: 'WebGL', wasm: 'WASM' }
  for (const node of document.querySelectorAll<HTMLElement>('[data-check]')) {
    const key = node.dataset.check as keyof typeof names
    const value = checks[key]
    node.innerHTML = `${indicator(value)} ${names[key]} ${checkLabel(value).toLowerCase()}`
  }
}

function render() {
  const page = currentPage()
  app.innerHTML = `<div class="layout">
    <aside class="sidebar">
      <a href="#play" class="brand" aria-label="Horizon X home"><span class="brand-mark">${icon('logo')}</span><span>HORIZON <strong>X</strong></span></a>
      <nav aria-label="Main navigation">${(Object.keys(pages) as Page[]).map(key => `<a href="#${key}" ${key === page ? 'aria-current="page"' : ''}>${icon(navIcons[key])}<span>${pages[key]}</span></a>`).join('')}</nav>
      <div class="sidebar-foot">${icon('monitor')} Browser launcher</div>
    </aside>
    <div class="workspace">
      <header class="topbar"><span>Launcher <b>/</b> <strong>${pages[page]}</strong></span><a href="#settings" class="top-settings" aria-label="Client settings">${icon('settings')}</a></header>
      <main id="main-content" tabindex="-1">${page === 'play' ? play() : page === 'settings' ? settings() : otherPages[page]()}</main>
      <footer><span>Horizon X</span><span>Independent browser launcher</span></footer>
    </div>
  </div>`
  updateChecks()
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-launch]')) link.href = urls[link.dataset.launch as Mode]
  document.querySelector('[data-modes]')?.addEventListener('click', event => {
    event.preventDefault()
    const section = document.getElementById('game-modes')
    section?.focus({ preventScroll: true })
    section?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  })
  const form = document.querySelector<HTMLFormElement>('#client-form')
  if (!form) return
  for (const mode of ['modern', 'classic'] as const) {
    const input = form.elements.namedItem(mode) as HTMLInputElement
    input.value = urls[mode]
  }
  form.addEventListener('submit', event => {
    event.preventDefault()
    const status = document.getElementById('form-status')!
    const data = new FormData(form)
    try {
      const modern = String(data.get('modern')).trim()
      const classic = String(data.get('classic')).trim()
      Object.assign(urls, { modern: modern ? clientUrl(modern) : '', classic: classic ? clientUrl(classic) : '' })
      try {
        localStorage.setItem(storageKey, JSON.stringify(urls))
        status.textContent = 'Client addresses saved.'
      } catch {
        status.textContent = 'Client addresses updated for this tab. Browser storage is unavailable.'
      }
    } catch (error) {
      status.textContent = (error as Error).message
    }
  })
}

async function detect() {
  checks.wasm = typeof globalThis.WebAssembly?.validate === 'function' &&
    WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])) ? 'available' : 'unavailable'
  try {
    const context = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl')
    checks.gl = context ? 'available' : 'unavailable'
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { checks.gl = 'unavailable' }
  updateChecks()
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<object | null> } }).gpu
  let timeout: number | undefined
  try {
    const adapter = gpu ? await Promise.race([
      gpu.requestAdapter(),
      new Promise<null>(resolve => { timeout = window.setTimeout(() => resolve(null), 4000) }),
    ]) : null
    checks.gpu = adapter ? 'available' : 'unavailable'
  } catch { checks.gpu = 'unavailable' }
  finally { window.clearTimeout(timeout) }
  updateChecks()
}

loadUrls()
render()
void detect()
window.addEventListener('hashchange', () => {
  render()
  window.scrollTo(0, 0)
  document.getElementById('main-content')?.focus()
})
