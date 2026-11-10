// A home-screen app has no reload button, and phones resume it from memory, so it
// can keep running an old version. Each time the app is opened or comes back to the
// front, ask the server for the page; if it points at a different script than the
// one running, reload (everything is saved in IndexedDB). Never while busy.
export function autoUpdate(busy: () => boolean) {
  const running = new URL(import.meta.url).pathname
  async function check() {
    if (document.visibilityState !== 'visible' || busy()) return
    try {
      // no-store: the service worker lets this through to the network (see sw.js)
      const html = await (await fetch(import.meta.env.BASE_URL, { cache: 'no-store' })).text()
      if (html.includes('/assets/') && !html.includes(running) && !busy()) location.reload()
    } catch {
      /* offline: keep the version we have */
    }
  }
  document.addEventListener('visibilitychange', check)
  check()
}
