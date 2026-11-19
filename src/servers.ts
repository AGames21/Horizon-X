import { preferences, type Mode } from './preferences'

type Server = { id: string; name: string; address: string; mode: Mode; favorite: boolean }
const key = 'horizon-x.servers.v1'

function addressOf(value: string) {
  const parsed = URL.parse(value)
  if (!parsed || !['ws:', 'wss:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash || /\s/.test(value)) {
    throw new Error('Enter a ws:// or wss:// server address without credentials, spaces or fragments.')
  }
  return parsed.href
}

function read(): Server[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(saved)) return []
    return saved.flatMap((server: Partial<Server> | null) => {
      if (!server || typeof server.id !== 'string' || typeof server.name !== 'string' || typeof server.address !== 'string' ||
          (server.mode !== 'modern' && server.mode !== 'classic') || typeof server.favorite !== 'boolean') return []
      try { return [{ id: server.id, name: server.name, address: addressOf(server.address), mode: server.mode, favorite: server.favorite }] }
      catch { return [] }
    })
  } catch { return [] }
}
let servers = read()

export function multiplayerPage() {
  return `<h1 class="page-title">Multiplayer</h1>
    <p class="page-intro">Save your servers and open them in a compatible client.</p>
    <div class="multiplayer-grid">
      <section class="panel server-panel"><h2>Saved servers</h2><div id="server-list" class="server-list"></div><p id="server-status" role="status"></p></section>
      <form id="server-form" class="panel">
        <h2 id="server-form-title">Add a server</h2>
        <label for="server-name">Server name</label><input id="server-name" name="name" maxlength="64" required />
        <label for="server-address">WebSocket address</label><input id="server-address" name="address" placeholder="wss://server.example/" maxlength="512" required />
        <label for="server-mode">Client</label><select id="server-mode" name="mode"><option value="modern">Modern Mode</option><option value="classic">Classic Mode</option></select>
        <div class="button-row"><button class="button primary" type="submit">Save server</button><button type="button" class="button secondary" id="cancel-edit" hidden>Cancel edit</button></div>
      </form>
    </div>
    <section class="panel"><h2>Connection instructions</h2><p>Use a compatible WebSocket endpoint from your server operator. HTTPS clients usually require wss://. For manual connections, open Multiplayer in your client and paste the saved address. For Horizon shared-world codes, use Join Shared World inside the game.</p></section>`
}

type LaunchUrl = (mode: Mode, address?: string) => string

export function bindServers(urls: Record<Mode, string>, launchUrl: LaunchUrl) {
  const form = document.querySelector<HTMLFormElement>('#server-form')
  if (!form) return
  const list = document.querySelector<HTMLElement>('#server-list')!
  const status = document.querySelector<HTMLElement>('#server-status')!
  const title = form.querySelector<HTMLElement>('#server-form-title')!
  const cancel = form.querySelector<HTMLButtonElement>('#cancel-edit')!
  const nameInput = form.querySelector<HTMLInputElement>('#server-name')!
  const addressInput = form.querySelector<HTMLInputElement>('#server-address')!
  const modeInput = form.querySelector<HTMLSelectElement>('#server-mode')!
  let editing = ''

  const reset = () => {
    form.reset()
    editing = ''
    modeInput.value = preferences.mode
    title.textContent = 'Add a server'
    cancel.hidden = true
  }

  const save = (message: string) => {
    try {
      localStorage.setItem(key, JSON.stringify(servers))
      status.textContent = message
    } catch { status.textContent = 'Server list updated for this tab. Browser storage is unavailable.' }
    renderList()
  }

  const button = (label: string, action: () => void) => {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'button secondary'
    item.textContent = label
    item.addEventListener('click', action)
    return item
  }

  function renderList() {
    list.replaceChildren()
    if (!servers.length) {
      const empty = document.createElement('p')
      empty.textContent = 'Add your first WebSocket server to get started.'
      list.append(empty)
    }
    for (const server of [...servers].sort((a, b) => Number(b.favorite) - Number(a.favorite))) {
      const row = document.createElement('article')
      row.className = 'server-row'
      const name = document.createElement('h3')
      name.textContent = server.name
      const address = document.createElement('p')
      address.className = 'server-address'
      address.textContent = server.address
      const mode = document.createElement('p')
      mode.textContent = server.mode === 'modern' ? 'Modern Mode' : 'Classic Mode'
      const actions = document.createElement('div')
      actions.className = 'button-row'
      const launch = document.createElement('a')
      launch.className = 'button primary'
      const direct = server.mode === 'modern' && preferences.horizonArgs
      if (urls[server.mode]) {
        launch.textContent = direct ? 'Join in Horizon Web' : 'Open client'
        launch.href = launchUrl(server.mode, direct ? server.address : undefined)
        launch.target = '_blank'
        launch.rel = 'noopener noreferrer'
      } else {
        launch.textContent = 'Set up client'
        launch.href = '#settings'
      }
      const favorite = button('Favorite', () => {
        server.favorite = !server.favorite
        save(server.favorite ? 'Server favorited.' : 'Server removed from favorites.')
        list.querySelector<HTMLButtonElement>(`[data-favorite="${CSS.escape(server.id)}"]`)?.focus()
      })
      favorite.dataset.favorite = server.id
      favorite.setAttribute('aria-pressed', String(server.favorite))
      actions.append(launch, favorite, button('Edit', () => {
        editing = server.id
        nameInput.value = server.name
        addressInput.value = server.address
        modeInput.value = server.mode
        title.textContent = 'Edit server'
        cancel.hidden = false
        nameInput.focus()
      }), button('Delete', () => {
        servers = servers.filter(entry => entry.id !== server.id)
        if (editing === server.id) reset()
        save('Server deleted.')
        nameInput.focus()
      }))
      row.append(name, address, mode, actions)
      list.append(row)
    }
  }

  cancel.addEventListener('click', () => { reset(); nameInput.focus() })
  form.addEventListener('submit', event => {
    event.preventDefault()
    try {
      const name = nameInput.value.trim()
      if (!name) throw new Error('Enter a server name.')
      const address = addressOf(addressInput.value.trim())
      const mode = modeInput.value === 'classic' ? 'classic' : 'modern'
      const current = servers.find(server => server.id === editing)
      if (current) Object.assign(current, { name, address, mode })
      else servers.push({ id: Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-'), name, address, mode, favorite: false })
      save(current ? 'Server updated.' : 'Server added.')
      reset()
    } catch (error) { status.textContent = (error as Error).message }
  })
  reset()
  renderList()
}
