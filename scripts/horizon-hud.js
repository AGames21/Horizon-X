// This module runs on the private Horizon Web origin, beside the unmodified game module.
if (new URLSearchParams(location.search).get('horizonXHud') === '1') {
  const hud = document.createElement('aside')
  hud.hidden = true
  hud.id = 'horizon-x-hud'
  hud.setAttribute('aria-label', 'Game performance')
  Object.assign(hud.style, {
    position: 'fixed', right: '12px', top: '12px', zIndex: '10',
    pointerEvents: 'none', padding: '6px 9px', borderRadius: '6px',
    color: '#fff', background: '#15131be8', font: '12px/1.5 system-ui, sans-serif',
  })
  document.body.append(hud)

  const format = (number, label, digits) =>
    typeof number === 'number' && Number.isFinite(number) && number >= 0 ? [number.toFixed(digits) + label] : []

  let lastFrame
  let lastUpdate = 0
  setInterval(() => {
    hud.hidden = true
    if (document.hidden) return
    try {
      const reading = JSON.parse(globalThis.horizon?.horizon_status?.() ?? 'null')
      if (!Number.isSafeInteger(reading?.frames) || reading.frames <= 0) return
      const now = performance.now()
      if (reading.frames !== lastFrame) {
        lastFrame = reading.frames
        lastUpdate = now
      }
      if (now - lastUpdate > 2500) return
      const stats = [
        ...format(reading.fps, ' FPS', 0),
        ...format(reading.cpu_ms, ' ms CPU', 1),
        ...format(reading.gpu_ms, ' ms GPU', 1),
      ]
      if (!stats.length) return
      hud.textContent = stats.join(' · ')
      hud.hidden = false
    } catch {
      // Wait for a valid sample. The upstream page owns startup and error messages.
    }
  }, 1000)
}
