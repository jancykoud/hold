// Draws the home page's film (scene.mjs) frame by frame and writes each frame as a picture; ffmpeg then joins them
// (public/images/CREDITS.md gives the commands).
//
//   node scripts/hero-film/render.mjs --three <folder of the three package> --out <folder> [--size 1920x1080] [--frames 0-359]
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { argument, openStage } from './stage.mjs'

const three = argument('three')
const out = argument('out')
if (three === undefined || out === undefined) throw new Error('Name the three package with --three and the folder for the frames with --out.')
const [width, height] = argument('size', '1920x1080').split('x').map(Number)
const [first, last] = argument('frames', '0-359').split('-').map(Number)

await mkdir(out, { recursive: true })
const stage = await openStage({ three, width, height, module: 'scene.mjs', start: 'scene.createFilm(canvas, size)' })
for (let frame = first; frame <= last; frame += 1) await stage.shoot(frame, join(out, `frame-${String(frame).padStart(4, '0')}.png`))
await stage.close()
console.log(`Drew frames ${String(first)} to ${String(last)} at ${String(width)}x${String(height)} into ${out}.`)
