// Makes the demonstration's sample photographs from one photograph of a parked car (public/images/CREDITS.md names
// it and its licence): the flank at the handover and again at the return, and the whole car left at a drop point.
// The marks are drawn on, and the site says so beside them. The fingerprints in packages/domain/src/capture-session.ts
// name these exact files, so they change with them.
//
//   node scripts/sample-photos.ts --source <the photograph, 3600 by 2700> [--out public/images]
import { join } from 'node:path'
import sharp from 'sharp'

const argument = (name: string, fallback?: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`)
  return at === -1 ? fallback : process.argv[at + 1]
}
const source = argument('source')
if (source === undefined) throw new Error('Name the photograph with --source.')
const out = argument('out') ?? 'public/images'

// The flank, cut from the photograph: the rear door, the fuel flap and the rear wheel, at 21 to 9. Every mark below is
// placed in this cut's own 1400 by 600 frame, the one src/features/marketing/evidence-photo.ts measures in.
const FLANK = { left: 1760, top: 1575, width: 1541, height: 660 }
const FRAME = { width: 1400, height: 600 }

// The maker's badge on a wheel's hub, covered: the photograph shows a car, not a make.
const hub = (x: number, y: number, r: number) => `<circle cx="${String(x)}" cy="${String(y)}" r="${String(r)}" fill="#1b1c1f"/><circle cx="${String(x)}" cy="${String(y)}" r="${String(r * 0.72)}" fill="#26282c"/>`

// A faint scuff low on the door, there at the handover and never charged.
const SCUFF = `<g opacity="0.55" stroke-linecap="round" fill="none" filter="url(#soft)">
  <ellipse cx="420" cy="482" rx="22" ry="9" fill="#7d8187" opacity="0.2" stroke="none"/>
  <path d="M402 486 L436 477" stroke="#6f7379" stroke-width="2.2"/>
  <path d="M407 491 L431 485" stroke="#868a90" stroke-width="1.6"/>
  <path d="M411 479 L440 472" stroke="#8f9399" stroke-width="1.3"/>
</g>`
// A scratch through the paint: the primer shows grey, darker where it is deepest, and it thins out at both ends.
const scratch = (deep: string, tail: string) => `<g stroke-linecap="round" fill="none" filter="url(#soft)">
  <path d="${tail}" stroke="#8d9197" stroke-width="1.1" opacity="0.7"/>
  <path d="${deep}" stroke="#6a6e75" stroke-width="2.1" opacity="0.9"/>
  <path d="${deep}" stroke="#44474d" stroke-width="0.9" opacity="0.75" transform="translate(0.4 0.7)"/>
</g>`
const SCRATCH = scratch('M531 357 C552 349 574 339 594 328', 'M518 363 C545 352 578 337 606 322')
// The contested scratch runs on from the scuff, which stays in view at its lower end.
const CONTESTED = scratch('M446 473 C472 463 506 448 536 434', 'M432 478 C465 466 508 447 552 427')
// A chip: an uneven patch through to the primer, bare metal at its middle, and flakes of paint beside it.
const CHIP = `<g filter="url(#soft)">
  <path d="M522 352 L527 345 L536 343 L541 337 L551 339 L558 333 L566 338 L577 336 L585 342 L592 349 L588 357 L579 359 L573 366 L563 364 L556 370 L547 366 L539 369 L531 363 L524 361 Z" fill="#2f3237" opacity="0.45" transform="translate(1 1.6)"/>
  <path d="M522 352 L527 345 L536 343 L541 337 L551 339 L558 333 L566 338 L577 336 L585 342 L592 349 L588 357 L579 359 L573 366 L563 364 L556 370 L547 366 L539 369 L531 363 L524 361 Z" fill="#83878e"/>
  <path d="M537 353 L543 347 L552 348 L559 343 L568 346 L575 350 L571 356 L562 358 L554 362 L545 359 Z" fill="#3a3d42"/>
  <path d="M546 353 L553 351 L561 352 L565 354 L557 356 L549 356 Z" fill="#9a9da3" opacity="0.6"/>
  <circle cx="516" cy="344" r="1.9" fill="#83878e"/><circle cx="597" cy="358" r="1.5" fill="#83878e"/><circle cx="571" cy="371" r="1.3" fill="#83878e"/><circle cx="534" cy="372" r="1.1" fill="#83878e"/>
</g>`

// The marks are softened by half a unit, as a lens softens an edge.
const overlay = (width: number, height: number, body: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}" viewBox="0 0 ${String(FRAME.width)} ${String(FRAME.height)}"><defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.45"/></filter></defs>${body}</svg>`)

async function flank(file: string, width: number, height: number, marks: string): Promise<void> {
  // The same cut and the same scuff in every picture of the flank, so only the new mark differs between two of them.
  const base = await sharp(source).extract(FLANK).resize(width, height, { kernel: 'lanczos3' }).toBuffer()
  await sharp(base)
    .composite([{ input: overlay(width, height, `${hub(952, 478, 25)}${SCUFF}${marks}`) }])
    .jpeg({ quality: 90 })
    .toFile(join(out, file))
  console.log(`${file}: ${String(width)} by ${String(height)}`)
}

await flank('flank-handover.jpg', 2400, 1028, '')
await flank('flank-return.jpg', 2400, 1028, SCRATCH)
await flank('sample-handover.jpg', 1600, 685, '')
await flank('sample-return-damage.jpg', 1600, 685, CHIP)
await flank('sample-return-contested.jpg', 1600, 685, CONTESTED)

// The whole car where it was left, four to three, with both hubs' badges covered.
const HUBS = [{ x: 2808, y: 2101 }, { x: 938, y: 2101 }]
const whole = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 3600 2700">${HUBS.map(({ x, y }) => `<circle cx="${String(x)}" cy="${String(y)}" r="30" fill="#1b1c1f"/>`).join('')}</svg>`
await sharp(source).resize(1200, 900).composite([{ input: Buffer.from(whole) }]).jpeg({ quality: 88 }).toFile(join(out, 'sample-drop-point.jpg'))
console.log('sample-drop-point.jpg: 1200 by 900')
