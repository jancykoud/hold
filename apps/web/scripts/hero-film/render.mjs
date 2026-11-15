// Draws the home page's film (scene.mjs) frame by frame in a browser and writes each frame as a picture; ffmpeg then
// joins them (public/images/CREDITS.md gives the two commands). Three.js is not one of Hold's dependencies: the film is
// made once, by hand, so its folder is named when this runs.
//
//   node scripts/hero-film/render.mjs --three <folder of the three package> --out <folder> [--size 1920x1080] [--frames 0-359]
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const argument = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`)
  return at === -1 ? fallback : process.argv[at + 1]
}
const three = argument('three')
const out = argument('out')
if (three === undefined || out === undefined) throw new Error('Name the three package with --three and the folder for the frames with --out.')
const [width, height] = argument('size', '1920x1080').split('x').map(Number)
const [first, last] = argument('frames', '0-359').split('-').map(Number)

const ORIGIN = 'http://film.local'
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html' }
const page = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#0b0a09}canvas{display:block}</style>
<canvas id="film" width="${String(width)}" height="${String(height)}"></canvas>
<script type="importmap">{"imports":{"three":"${ORIGIN}/three/build/three.module.js","three/addons/":"${ORIGIN}/three/examples/jsm/"}}</script>
<script type="module">
  import { createFilm } from '${ORIGIN}/scene.mjs'
  window.drawFrame = createFilm(document.getElementById('film'), { width: ${String(width)}, height: ${String(height)} })
  window.ready = true
</script>`

await mkdir(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
tab.on('console', (message) => { if (message.type() === 'error') console.error(message.text()) })
tab.on('pageerror', (error) => { console.error(String(error)) })
// Every file the page asks for is read from this folder or from the three package: nothing comes from the network.
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
for (let frame = first; frame <= last; frame += 1) {
  await tab.evaluate((index) => { window.drawFrame(index) }, frame)
  await tab.locator('#film').screenshot({ path: join(out, `frame-${String(frame).padStart(4, '0')}.png`) })
}
await browser.close()
console.log(`Drew frames ${String(first)} to ${String(last)} at ${String(width)}x${String(height)} into ${out}.`)
