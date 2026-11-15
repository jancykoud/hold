// A browser page that draws one of Hold's own scenes with Three.js, for the scripts beside it. Every file the page
// asks for is read from this folder or from the three package named on the command line: nothing comes from the
// network. Three.js is not one of Hold's dependencies, since these pictures are made once, by hand.
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'http://film.local'
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript' }

export const argument = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`)
  return at === -1 ? fallback : process.argv[at + 1]
}

// Opens the page at this size with `window.draw` set by `start`, a line of code that may use the module's exports.
export async function openStage({ three, width, height, module, start }) {
  const page = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#0b0a09}canvas{display:block}</style>
<canvas id="stage" width="${String(width)}" height="${String(height)}"></canvas>
<script type="importmap">{"imports":{"three":"${ORIGIN}/three/build/three.module.js","three/addons/":"${ORIGIN}/three/examples/jsm/"}}</script>
<script type="module">
  import * as scene from '${ORIGIN}/${module}'
  const canvas = document.getElementById('stage')
  const size = { width: ${String(width)}, height: ${String(height)} }
  window.draw = ${start}
  window.ready = true
</script>`
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
  const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  tab.on('console', (message) => { if (message.type() === 'error') console.error(message.text()) })
  tab.on('pageerror', (error) => { console.error(String(error)) })
  await tab.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: page })
    const file = path.startsWith('/three/') ? join(resolve(three), path.slice('/three/'.length)) : join(here, path)
    try {
      return await route.fulfill({ contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: await readFile(file) })
    } catch {
      return route.fulfill({ status: 404, body: '' })
    }
  })
  await tab.goto(`${ORIGIN}/`)
  await tab.waitForFunction('window.ready === true', undefined, { timeout: 60_000 })
  return {
    // Draws with the given value and saves what the canvas shows.
    async shoot(value, path) {
      await tab.evaluate((given) => { window.draw(given) }, value)
      await tab.locator('#stage').screenshot({ path })
    },
    close: () => browser.close(),
  }
}
