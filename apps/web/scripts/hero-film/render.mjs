// Draws one of the public pages' films frame by frame and writes each frame as a picture; ffmpeg then joins them
// (public/images/CREDITS.md gives the commands). `--film hero` is the home page's (scene.mjs, 360 frames), `--film how`
// the How it works page's (how.mjs, 1,185 frames).
//
//   node scripts/hero-film/render.mjs --three <folder of the three package> --out <folder> [--film hero] [--size 1920x1080] [--frames 0-359]
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { argument, openStage } from './stage.mjs'

const three = argument('three')
const out = argument('out')
if (three === undefined || out === undefined) throw new Error('Name the three package with --three and the folder for the frames with --out.')
const [width, height] = argument('size', '1920x1080').split('x').map(Number)
const film = { hero: { module: 'scene.mjs', frames: '0-359' }, how: { module: 'how.mjs', frames: '0-1184' } }[argument('film', 'hero')]
if (film === undefined) throw new Error('Name the film with --film hero or --film how.')
const [first, last] = argument('frames', film.frames).split('-').map(Number)

await mkdir(out, { recursive: true })
const stage = await openStage({ three, width, height, module: film.module, start: 'scene.createFilm(canvas, size)' })
for (let frame = first; frame <= last; frame += 1) await stage.shoot(frame, join(out, `frame-${String(frame).padStart(4, '0')}.png`))
await stage.close()
console.log(`Drew frames ${String(first)} to ${String(last)} at ${String(width)}x${String(height)} into ${out}.`)
