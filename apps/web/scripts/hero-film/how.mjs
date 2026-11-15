// The film behind the How it works page: one rental of a car, told in five moments. Priya's assistant books through
// Hold's MCP server; she approves the hold; Jonas walks round the car in nineteen photographs; at the return a sheet of
// light finds the scratch in the door; Tomás approves the claim and the hold splits into what is taken and what is
// released, with each call to PayPal filling PayPal's record. Everything is drawn here: the people, the screens and
// the car are Hold's own (public/images/CREDITS.md). The loop is FRAMES long and ends where it begins.
import * as THREE from 'three'
import { PAPER, RUST, bodyPoint, drawn, openSet, parkCar, scanSheet, smooth } from './scene.mjs'

export const FRAMES = 1185
export const FRAMES_PER_SECOND = 30

// When each moment begins, in seconds: the same marks as HOW_IT_WORKS_CHAPTERS in src/features/marketing/films.ts.
const RESERVE = 7
const HAND_OVER = 14
const RETURN = 20.4
const SETTLE = 26.2
const END = FRAMES / FRAMES_PER_SECOND

// The worked example's figures (src/features/marketing/example-rental.ts), written as the site writes them.
const FEE = '€195.00'
const HOLD = '€1,200.00'
const TAKEN = '€180.00'
const RELEASED = '€1,020.00'
const TAKEN_SHARE = 180 / 1200

// The plan Hold suggests for a car (packages/domain/src/photo-plan.ts), each view with where the camera aims.
const VIEWS = [
  ['Front', [2.45, 0.7, 0]],
  ['Rear', [-2.45, 0.75, 0]],
  ['Left side', [0, 0.8, 1.02]],
  ['Right side', [0, 0.8, -1.02]],
  ['Front left corner', [2.05, 0.7, 0.8]],
  ['Front right corner', [2.05, 0.7, -0.8]],
  ['Rear left corner', [-2.05, 0.75, 0.8]],
  ['Rear right corner', [-2.05, 0.75, -0.8]],
  ['Front left wheel', [1.44, 0.37, 0.95]],
  ['Front right wheel', [1.44, 0.37, -0.95]],
  ['Rear left wheel', [-1.38, 0.37, 0.95]],
  ['Rear right wheel', [-1.38, 0.37, -0.95]],
  ['Windscreen', [1.05, 1.12, 0]],
  ['Rear window', [-1.35, 1.1, 0]],
  ['Roof', [-0.3, 1.34, 0]],
  ['Front seats', [0.35, 1.0, 0.45]],
  ['Back seats', [-0.45, 1.0, 0.45]],
  ['Boot', [-2.1, 0.98, 0]],
  ['Dashboard', [0.75, 1.02, 0.3]],
]
// The walk round the car: when it starts and how long each photograph takes.
const WALK = { from: HAND_OVER + 0.6, each: 0.25 }
const taken = (t) => Math.max(0, Math.min(VIEWS.length, Math.floor((t - WALK.from) / WALK.each)))

const INK = '#141312'
const MUTED = '#6d675e'
const LINE = '#d9d4ca'
const PAPER_CSS = '#f3f1ec'
const RUST_CSS = '#d9541e'
const GREEN = '#1f8a5b'
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const MONO = 'Menlo, Monaco, "Courier New", monospace'

// Words on a canvas. Sizes are in the canvas's own pixels.
function write(c, words, x, y, { size = 22, weight = 400, colour = INK, align = 'left', mono = false } = {}) {
  c.font = `${String(weight)} ${String(size)}px ${mono ? MONO : SANS}`
  c.fillStyle = colour
  c.textAlign = align
  c.textBaseline = 'alphabetic'
  c.fillText(words, x, y)
}

function block(c, x, y, w, h, radius, fill, stroke) {
  c.beginPath()
  c.roundRect(x, y, w, h, radius)
  if (fill !== undefined) {
    c.fillStyle = fill
    c.fill()
  }
  if (stroke !== undefined) {
    c.strokeStyle = stroke
    c.lineWidth = 2
    c.stroke()
  }
}

function tick(c, x, y, size, colour = GREEN) {
  c.beginPath()
  c.arc(x, y, size, 0, Math.PI * 2)
  c.fillStyle = colour
  c.fill()
  c.beginPath()
  c.moveTo(x - size * 0.45, y + size * 0.02)
  c.lineTo(x - size * 0.1, y + size * 0.38)
  c.lineTo(x + size * 0.48, y - size * 0.34)
  c.strokeStyle = '#ffffff'
  c.lineWidth = size * 0.22
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.stroke()
}

// A screen that floats in the set and is drawn again for every frame.
function screen(width, height, pixels) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * pixels)
  canvas.height = Math.round(height * pixels)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, fog: false }))
  const c = canvas.getContext('2d')
  return {
    mesh,
    paint(draw) {
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalAlpha = 1
      c.clearRect(0, 0, canvas.width, canvas.height)
      draw(c, canvas.width, canvas.height)
      texture.needsUpdate = true
    },
  }
}

// A phone's face: paper, a dark rim, the hour and the shop's name. What follows is drawn at `shown` strength.
function phone(c, w, h, right, shown) {
  block(c, 3, 3, w - 6, h - 6, 34, PAPER_CSS, INK)
  c.lineWidth = 6
  c.stroke()
  write(c, '9:41', 30, 46, { size: 17, weight: 600 })
  write(c, 'hold', 30, 92, { size: 26, weight: 800 })
  write(c, right, w - 30, 90, { size: 15, colour: MUTED, align: 'right', mono: true })
  c.globalAlpha = shown
}

// A person, in the plain shapes of a wooden figure, facing +z. About 1.72 metres tall.
function figure({ shirt, hair, badge }) {
  const person = new THREE.Group()
  const cloth = (colour) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.72, metalness: 0 })
  const skin = cloth(0xe7b592)
  const add = (geometry, material, x, y, z) => {
    const part = new THREE.Mesh(geometry, material)
    part.position.set(x, y, z)
    person.add(part)
    return part
  }
  for (const side of [1, -1]) {
    add(new THREE.CapsuleGeometry(0.085, 0.6, 6, 16), cloth(0x2b3a5c), side * 0.1, 0.41, 0)
    add(new THREE.CapsuleGeometry(0.062, 0.44, 6, 14), cloth(shirt), side * 0.27, 1.1, 0).rotation.z = side * 0.09
    add(new THREE.SphereGeometry(0.066, 16, 12), skin, side * 0.3, 0.8, 0)
    add(new THREE.SphereGeometry(0.016, 10, 8), cloth(0x1a1614), side * 0.058, 1.585, 0.158)
  }
  add(new THREE.CapsuleGeometry(0.2, 0.36, 8, 20), cloth(shirt), 0, 1.1, 0)
  add(new THREE.SphereGeometry(0.168, 28, 20), skin, 0, 1.57, 0)
  add(new THREE.SphereGeometry(0.176, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.46), cloth(hair), 0, 1.585, -0.012).rotation.x = -0.22
  if (badge) add(new THREE.BoxGeometry(0.16, 0.2, 0.02), cloth(RUST), 0, 1.16, 0.2)
  return person
}

// A point that travels from one place to another and lights up on the way: a call, and its answer coming back.
function courier(scene, halo) {
  const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xffb48a, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false }))
  dot.scale.setScalar(0.34)
  dot.renderOrder = 12
  scene.add(dot)
  return (from, to, progress) => {
    const there = progress <= 0.5 ? progress * 2 : 2 - progress * 2
    const eased = smooth(0, 1, there)
    dot.position.lerpVectors(from, to, eased)
    dot.position.y += Math.sin(eased * Math.PI) * 0.45
    dot.material.opacity = progress > 0 && progress < 1 ? 0.95 : 0
  }
}

export function createFilm(canvas, { width, height }) {
  const tall = height > width
  const { renderer, scene } = openSet(canvas, { width, height })
  const coupe = parkCar(scene)
  const { sheet, sweep } = scanSheet(scene)

  // The three people. Priya rents, Jonas works the counter, Tomás owns the agency.
  const priya = figure({ shirt: 0xe8705a, hair: 0x2a2320 })
  priya.position.set(-2.15, 0, 2.3)
  priya.rotation.y = 0.35
  const jonas = figure({ shirt: 0x8f9a8a, hair: 0x7a5236, badge: true })
  const tomas = figure({ shirt: 0x2f3338, hair: 0x9a9690 })
  tomas.position.set(-4.5, 0, 0.1)
  tomas.rotation.y = 0.5
  scene.add(priya, jonas, tomas)
  const atCounter = new THREE.Vector3(4.25, 0, -1.55)
  const atCar = new THREE.Vector3(2.95, 0, 1.75)

  // The counter Jonas starts behind, with the agency's name, and Tomás's desk.
  const dark = new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.6, metalness: 0.1 })
  const wood = new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 0.55, metalness: 0 })
  const counter = new THREE.Group()
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.95, 0.62), dark)
  base.position.y = 0.475
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.05, 0.74), wood)
  top.position.y = 0.975
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.3),
    new THREE.MeshBasicMaterial({
      transparent: true,
      toneMapped: false,
      map: drawn(680, 120, (c, w, h) => {
        c.font = `800 54px ${SANS}`
        c.fillStyle = PAPER_CSS
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.letterSpacing = '6px'
        c.fillText('RIBEIRA RENTALS', w / 2, h / 2)
      }),
    }),
  )
  sign.position.set(0, 0.52, 0.315)
  counter.add(base, top, sign)
  counter.position.set(4.25, 0, -0.95)
  counter.rotation.y = -0.42
  scene.add(counter)
  const desk = new THREE.Group()
  const deskBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.72, 0.6), dark)
  deskBase.position.y = 0.36
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.05, 0.72), wood)
  deskTop.position.y = 0.745
  desk.add(deskBase, deskTop)
  desk.position.set(-4.3, 0, 0.75)
  desk.rotation.y = 0.5
  scene.add(desk)

  // The screens: each person's own, Hold's MCP server and PayPal's record at the back, and the hold itself.
  const priyaScreen = screen(0.86, 1.6, 500)
  priyaScreen.mesh.position.set(-1.28, 1.5, 2.45)
  const jonasScreen = screen(0.62, 1.12, 560)
  const tomasScreen = screen(1.34, 0.9, 520)
  tomasScreen.mesh.position.set(-3.45, 1.68, 1.0)
  const server = screen(2.2, 1.0, 300)
  server.mesh.position.set(-3.1, 2.75, -2.4)
  const paypal = screen(2.2, 1.5, 300)
  paypal.mesh.position.set(2.7, 2.85, -2.4)
  const hold = screen(1.5, 1.5, 400)
  hold.mesh.position.set(0.5, 2.45, -0.6)
  hold.mesh.material.depthTest = false
  hold.mesh.renderOrder = 9
  const screens = [priyaScreen, jonasScreen, tomasScreen, server, paypal, hold]
  for (const each of screens) scene.add(each.mesh)

  const halo = drawn(128, 128, (c, w, h) => {
    const fade = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2)
    fade.addColorStop(0, 'rgba(255,255,255,1)')
    fade.addColorStop(0.3, 'rgba(255,255,255,0.45)')
    fade.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = fade
    c.fillRect(0, 0, w, h)
  })
  const send = courier(scene, halo)

  // The four calls the assistant makes of Hold's server, and the six PayPal is asked for or answers with.
  const CALLS = [
    ['find_shops', 1.5],
    ['check_availability', 2.7],
    ['quote_rental', 3.9],
    ['create_booking', 5.1],
  ]
  const PAYPAL = [
    ['Order created', '', 6.4],
    ['Fee captured', FEE, 8.6],
    ['Authorization', HOLD, 11.0],
    ['Capture', TAKEN, 33.2],
    ['Rest released', RELEASED, 34.8],
    ['Webhook verified, read back', '', 36.2],
  ]
  const CALL_TAKES = 0.9

  // The frame that shows Jonas where to aim, a mark left at each view taken, and the flash of each photograph.
  const white = new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, depthTest: false, toneMapped: false })
  const rust = new THREE.MeshBasicMaterial({ color: RUST, transparent: true, depthTest: false, toneMapped: false })
  const brackets = (material, arm, thick) => {
    const group = new THREE.Group()
    const corners = []
    for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const corner = new THREE.Group()
      const flat = new THREE.Mesh(new THREE.PlaneGeometry(arm, thick), material)
      flat.position.x = (-x * arm) / 2
      const upright = new THREE.Mesh(new THREE.PlaneGeometry(thick, arm), material)
      upright.position.y = (-y * arm) / 2
      flat.renderOrder = upright.renderOrder = 10
      corner.add(flat, upright)
      corner.userData.toward = new THREE.Vector2(x, y)
      corners.push(corner)
      group.add(corner)
    }
    scene.add(group)
    return { group, reach: (by) => corners.forEach((corner) => corner.position.set(corner.userData.toward.x * by, corner.userData.toward.y * by, 0)) }
  }
  const aim = brackets(white, 0.14, 0.016)
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false }))
  flash.renderOrder = 11
  scene.add(flash)
  const pins = VIEWS.map(([, at]) => {
    const pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: RUST, depthTest: false, transparent: true, fog: false }))
    pin.position.set(...at)
    pin.scale.setScalar(0.11)
    pin.renderOrder = 9
    scene.add(pin)
    return pin
  })

  // The scratch that is in the door at the return and was not at the handover, and what closes on it.
  const door = bodyPoint(0.24, 0.16, 0.003)
  const scratch = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.012), new THREE.MeshBasicMaterial({ color: 0xe9edf5, transparent: true }))
  scratch.position.copy(door)
  scratch.rotation.z = -0.16
  const flake = scratch.clone()
  flake.scale.set(0.4, 0.7, 1)
  flake.position.add(new THREE.Vector3(0.09, -0.03, 0))
  flake.rotation.z = -0.3
  coupe.add(scratch, flake)
  const found = brackets(rust, 0.1, 0.012)
  found.group.position.copy(door).add(new THREE.Vector3(0, 0, 0.03))
  const finding = screen(0.9, 0.34, 600)
  finding.mesh.material.depthTest = false
  finding.mesh.renderOrder = 10
  finding.mesh.position.set(0.62, 0.52, 0)
  found.group.add(finding.mesh)
  finding.paint((c, w, h) => {
    block(c, 2, 2, w - 4, h - 4, 10, 'rgba(14,13,12,0.9)', RUST_CSS)
    block(c, 26, 28, 78, 36, 8, RUST_CSS)
    write(c, 'NEW', 65, 54, { size: 22, weight: 700, colour: '#ffffff', align: 'center', mono: true })
    write(c, 'Scratch on the door', 26, 112, { size: 38, weight: 700, colour: PAPER_CSS })
    write(c, 'Not there at handover · high confidence', 26, 160, { size: 22, colour: 'rgba(243,241,236,0.7)' })
  })

  const camera = new THREE.PerspectiveCamera(tall ? 40 : 27, width / height, 0.1, 80)
  // Where the camera stands and what it looks at, second by second. The last mark is the first again.
  const PATH = [
    [0, [-1.6, 1.75, 8.6], [-1.55, 1.6, 0.6]],
    [6.4, [-1.35, 1.75, 8.3], [-1.35, 1.65, 0.6]],
    [9.6, [-0.7, 1.85, 8.9], [-0.6, 1.75, 0.6]],
    [13.2, [0.4, 1.85, 9.4], [0.5, 1.5, 0.3]],
    [15.6, [3.0, 1.6, 8.4], [1.2, 1.05, 0.2]],
    [19.4, [5.4, 1.95, 6.6], [1.0, 0.95, 0.1]],
    [22.2, [2.5, 1.5, 7.6], [0.8, 0.95, 0.2]],
    [25.4, [1.5, 1.45, 6.5], [0.7, 0.95, 0.3]],
    [28.6, [-3.1, 1.8, 8.3], [-3.2, 1.55, 0.5]],
    [32.2, [-1.5, 1.85, 8.9], [-1.2, 1.8, 0.5]],
    [35.6, [0.3, 2.05, 9.8], [0.4, 2.0, 0.2]],
    [END, [-1.6, 1.75, 8.6], [-1.55, 1.6, 0.6]],
  ]
  const stand = new THREE.Vector3()
  const look = new THREE.Vector3()
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const place = (t) => {
    const next = Math.max(1, PATH.findIndex(([at]) => at > t))
    const [t0, p0, l0] = PATH[next - 1]
    const [t1, p1, l1] = PATH[next]
    const along = smooth(t0, t1, t)
    stand.set(...p0).lerp(from.set(...p1), along)
    look.set(...l0).lerp(to.set(...l1), along)
    // A phone shows a narrower slice, so the camera steps back.
    if (tall) stand.z *= 1.22
  }

  const drawPriya = (t) => {
    priyaScreen.paint((c, w, h) => {
      if (t < RESERVE) {
        // The loop begins on an empty phone, as it ends on one.
        phone(c, w, h, 'YOUR ASSISTANT', smooth(0.05, 0.45, t))
        write(c, 'Your assistant', 30, 150, { size: 32, weight: 800 })
        write(c, 'Connected to Hold, over MCP', 30, 182, { size: 16, colour: RUST_CSS, mono: true })
        c.globalAlpha = smooth(0.5, 0.9, t)
        block(c, 62, 212, w - 92, 92, 18, INK)
        write(c, 'Book me a compact car,', 84, 250, { size: 21, weight: 600, colour: PAPER_CSS })
        write(c, 'Friday to Monday.', 84, 280, { size: 21, weight: 600, colour: PAPER_CSS })
        CALLS.forEach(([name, at], index) => {
          c.globalAlpha = smooth(at, at + 0.25, t)
          const y = 350 + index * 62
          block(c, 30, y, w - 60, 48, 12, '#ffffff', LINE)
          if (t > at + CALL_TAKES) tick(c, 58, y + 24, 11)
          else {
            c.beginPath()
            c.arc(58, y + 24, 10, t * 7, t * 7 + 4.4)
            c.strokeStyle = RUST_CSS
            c.lineWidth = 3
            c.stroke()
          }
          write(c, name, 84, y + 31, { size: 19, mono: true })
        })
        c.globalAlpha = smooth(6.1, 6.5, t)
        write(c, 'Booked. Approve the fee', 30, 640, { size: 22, weight: 600 })
        write(c, 'in PayPal.', 30, 670, { size: 22, weight: 600 })
        return
      }
      if (t < HAND_OVER) {
        phone(c, w, h, 'RIBEIRA RENTALS', smooth(RESERVE, RESERVE + 0.4, t))
        write(c, 'Compact car · 3 days', 30, 150, { size: 30, weight: 800 })
        block(c, 30, 180, w - 60, 100, 14, '#ffffff', LINE)
        write(c, 'RENTAL FEE', 50, 212, { size: 14, colour: MUTED, mono: true })
        write(c, FEE, 50, 256, { size: 34, weight: 800 })
        if (t > 9.4) {
          block(c, w - 124, 196, 74, 30, 15, '#dff1e7')
          write(c, 'Paid', w - 87, 217, { size: 16, weight: 700, colour: GREEN, align: 'center' })
        }
        block(c, 30, 296, w - 60, 122, 14, '#ffffff', LINE)
        write(c, 'HOLD', 50, 328, { size: 14, colour: MUTED, mono: true })
        write(c, HOLD, 50, 372, { size: 34, weight: 800 })
        write(c, 'Reserved in your own account.', 50, 400, { size: 16, colour: MUTED })
        write(c, 'This is not a charge.', 30, 452, { size: 18, weight: 600 })
        write(c, 'DAMAGE PRICES', 30, 498, { size: 14, colour: MUTED, mono: true })
        ;[['Scratch on the bodywork', '€180'], ['Dent in a body panel', '€320'], ['Stone chip in the windscreen', '€90']].forEach(([what, price], index) => {
          const y = 532 + index * 34
          write(c, what, 30, y, { size: 17 })
          write(c, price, w - 30, y, { size: 17, align: 'right', mono: true })
        })
        const approved = t > 11.8
        block(c, 30, 668, w - 60, 62, 31, approved ? GREEN : RUST_CSS)
        write(c, approved ? 'Hold approved' : 'Approve the hold', w / 2, 707, { size: 21, weight: 700, colour: '#ffffff', align: 'center' })
        return
      }
      if (t < 30.4) {
        phone(c, w, h, 'RIBEIRA RENTALS', smooth(HAND_OVER, HAND_OVER + 0.4, t))
        write(c, 'Condition report', 30, 150, { size: 30, weight: 800 })
        write(c, `${String(taken(t))} of ${String(VIEWS.length)} photographs`, 30, 182, { size: 17, colour: MUTED })
        VIEWS.forEach((_, index) => {
          const x = 30 + (index % 4) * 94
          const y = 206 + Math.floor(index / 4) * 74
          const done = index < taken(t)
          block(c, x, y, 84, 64, 8, done ? '#1a2d6b' : undefined, done ? undefined : LINE)
          if (done) tick(c, x + 66, y + 48, 9)
        })
        if (t > 19.7) {
          write(c, '48,210 km · fuel 8/8', 30, 610, { size: 18, mono: true })
          write(c, '2 marks already there, noted.', 30, 644, { size: 17, colour: MUTED })
          tick(c, 46, 700, 14)
          write(c, 'Confirmed by Priya', 72, 707, { size: 20, weight: 700, colour: GREEN })
        }
        return
      }
      const shown = smooth(30.4, 30.8, t) * (1 - smooth(38.4, 39.3, t))
      phone(c, w, h, 'RIBEIRA RENTALS', shown)
      write(c, 'A claim to review', 30, 150, { size: 30, weight: 800 })
      write(c, 'The same photographs the shop sees.', 30, 182, { size: 16, colour: MUTED })
      for (const [x, label, marked] of [[30, 'HANDOVER', false], [w / 2 + 6, 'RETURN', true]]) {
        block(c, x, 206, w / 2 - 36, 150, 10, '#1a2d6b')
        write(c, label, x + 12, 232, { size: 13, colour: 'rgba(243,241,236,0.8)', mono: true })
        if (marked) {
          c.beginPath()
          c.moveTo(x + 44, 308)
          c.lineTo(x + 132, 286)
          c.strokeStyle = '#e9edf5'
          c.lineWidth = 3
          c.stroke()
          c.strokeStyle = RUST_CSS
          c.strokeRect(x + 30, 268, 118, 58)
        }
      }
      write(c, 'Scratch on the bodywork', 30, 404, { size: 21, weight: 700 })
      write(c, TAKEN, w - 30, 404, { size: 21, weight: 700, align: 'right', mono: true })
      write(c, 'From the price list you accepted.', 30, 434, { size: 16, colour: MUTED })
      if (t > 32.4) {
        tick(c, 46, 520, 14)
        write(c, 'Accepted', 72, 527, { size: 22, weight: 700, colour: GREEN })
        if (t > 35) {
          write(c, `${TAKEN} taken`, 30, 600, { size: 22, weight: 700 })
          write(c, `${RELEASED} released`, 30, 634, { size: 22, weight: 700, colour: GREEN })
        }
      } else {
        block(c, 30, 490, w / 2 - 36, 58, 29, INK)
        write(c, 'Accept', 30 + (w / 2 - 36) / 2, 526, { size: 20, weight: 700, colour: '#ffffff', align: 'center' })
        block(c, w / 2 + 6, 490, w / 2 - 36, 58, 29, undefined, INK)
        write(c, 'I disagree', w / 2 + 6 + (w / 2 - 36) / 2, 526, { size: 20, weight: 700, align: 'center' })
      }
    })
  }

  const drawJonas = (t) => {
    jonasScreen.paint((c, w, h) => {
      if (t < HAND_OVER || t > 37.6) {
        phone(c, w, h, 'TODAY', 1)
        write(c, 'Today', 30, 150, { size: 30, weight: 800 })
        block(c, 30, 176, w - 60, 96, 14, '#ffffff', LINE)
        write(c, '10:00 · PICKUP', 48, 208, { size: 14, colour: MUTED, mono: true })
        write(c, 'Priya N. · Compact car 2', 48, 244, { size: 19, weight: 700 })
        return
      }
      if (t < RETURN) {
        const count = taken(t)
        phone(c, w, h, 'HANDOVER', smooth(HAND_OVER, HAND_OVER + 0.3, t))
        if (count < VIEWS.length) {
          write(c, VIEWS[count][0], 30, 150, { size: 26, weight: 800 })
          write(c, `${String(count + 1)} of ${String(VIEWS.length)}`, 30, 180, { size: 17, colour: MUTED, mono: true })
          block(c, 30, 200, w - 60, 300, 14, '#101a3d')
          c.strokeStyle = PAPER_CSS
          c.lineWidth = 4
          for (const [x, y, dx, dy] of [[52, 222, 1, 1], [w - 52, 222, -1, 1], [52, 478, 1, -1], [w - 52, 478, -1, -1]]) {
            c.beginPath()
            c.moveTo(x + dx * 34, y)
            c.lineTo(x, y)
            c.lineTo(x, y + dy * 34)
            c.stroke()
          }
          c.beginPath()
          c.arc(w / 2, 556, 30, 0, Math.PI * 2)
          c.fillStyle = RUST_CSS
          c.fill()
        } else {
          tick(c, 48, 150, 15)
          write(c, 'Sealed', 76, 160, { size: 28, weight: 800 })
          write(c, '19 photographs', 30, 214, { size: 20 })
          write(c, '48,210 km · fuel 8/8', 30, 250, { size: 18, mono: true })
        }
        return
      }
      phone(c, w, h, 'RETURN', smooth(RETURN, RETURN + 0.3, t))
      write(c, 'Compact car 2', 30, 150, { size: 26, weight: 800 })
      write(c, '48,690 km · fuel 8/8', 30, 182, { size: 17, mono: true })
      write(c, 'Comparing 19 pairs', 30, 240, { size: 19 })
      block(c, 30, 258, w - 60, 12, 6, LINE)
      block(c, 30, 258, (w - 60) * smooth(RETURN + 0.6, RETURN + 3.5, t), 12, 6, RUST_CSS)
      if (t > RETURN + 4.2) {
        write(c, '1 new mark found', 30, 330, { size: 23, weight: 800, colour: RUST_CSS })
        write(c, `Scratch on the bodywork · ${TAKEN}`, 30, 364, { size: 16 })
      }
      if (t > SETTLE + 3.6) {
        tick(c, 44, 430, 13)
        write(c, 'Approved by Tomás', 68, 437, { size: 19, weight: 700, colour: GREEN })
      } else if (t > SETTLE) write(c, 'Waiting for the owner', 30, 437, { size: 18, colour: MUTED })
    })
  }

  const drawTomas = (t) => {
    tomasScreen.paint((c, w, h) => {
      block(c, 3, 3, w - 6, h - 6, 18, PAPER_CSS, INK)
      write(c, 'hold', 30, 54, { size: 26, weight: 800 })
      write(c, 'RIBEIRA RENTALS · OWNER', w - 30, 52, { size: 15, colour: MUTED, align: 'right', mono: true })
      if (t < SETTLE || t > 37.6) {
        ;[['Items out', '14'], ['Due back today', '6'], ['Holds in place', '€16,800']].forEach(([label, value], index) => {
          const x = 30 + index * 216
          block(c, x, 96, 200, 150, 14, '#ffffff', LINE)
          write(c, label, x + 18, 132, { size: 17, colour: MUTED })
          write(c, value, x + 18, 200, { size: 42, weight: 800 })
        })
        write(c, 'Nothing waits for your decision.', 30, 310, { size: 20, colour: MUTED })
        return
      }
      c.globalAlpha = smooth(SETTLE, SETTLE + 0.4, t)
      write(c, 'A claim to approve · Hold 2291', 30, 112, { size: 28, weight: 800 })
      block(c, 30, 136, w - 60, 112, 14, '#ffffff', LINE)
      write(c, 'Scratch on the bodywork', 50, 180, { size: 22, weight: 700 })
      write(c, TAKEN, w - 50, 180, { size: 22, weight: 700, align: 'right', mono: true })
      write(c, 'Left side, handover and return · price list version 3', 50, 220, { size: 16, colour: MUTED })
      write(c, `Never more than the list, never more than the ${HOLD} held.`, 30, 290, { size: 17, colour: MUTED })
      const approved = t > SETTLE + 3.4
      const pressing = smooth(SETTLE + 2.4, SETTLE + 3.4, t)
      block(c, 30, 330, 330, 66, 33, approved ? GREEN : RUST_CSS)
      write(c, approved ? 'Approved with passkey' : 'Approve with passkey', 195, 372, { size: 21, weight: 700, colour: '#ffffff', align: 'center' })
      if (!approved && pressing > 0) {
        c.beginPath()
        c.arc(416, 363, 22, -Math.PI / 2, -Math.PI / 2 + pressing * Math.PI * 2)
        c.strokeStyle = RUST_CSS
        c.lineWidth = 5
        c.stroke()
      }
      if (approved) write(c, 'Tomás · 17 Oct, 17:52', 390, 372, { size: 17, colour: MUTED, mono: true })
    })
  }

  const drawServer = (t) => {
    server.paint((c, w, h) => {
      block(c, 2, 2, w - 4, h - 4, 12, 'rgba(14,13,12,0.92)', 'rgba(243,241,236,0.25)')
      write(c, 'hold', 34, 78, { size: 58, weight: 800, colour: PAPER_CSS })
      write(c, 'MCP SERVER', 36, 122, { size: 22, colour: RUST_CSS, mono: true })
      write(c, 'Every call checked and logged', 36, 162, { size: 21, colour: 'rgba(243,241,236,0.7)' })
      CALLS.forEach(([name, at], index) => {
        const lit = t > at && t < at + CALL_TAKES
        const x = 36 + (index % 2) * 300
        const y = 192 + Math.floor(index / 2) * 46
        block(c, x, y, 284, 36, 8, lit ? RUST_CSS : 'rgba(243,241,236,0.08)')
        write(c, name, x + 14, y + 25, { size: 19, colour: lit ? '#ffffff' : 'rgba(243,241,236,0.75)', mono: true })
      })
      c.fillStyle = RUST_CSS
      c.fillRect(0, h - 8, w, 8)
    })
  }

  const drawPayPal = (t) => {
    const gone = 1 - smooth(38, 39.2, t)
    paypal.paint((c, w, h) => {
      block(c, 2, 2, w - 4, h - 4, 12, 'rgba(14,13,12,0.92)', 'rgba(243,241,236,0.25)')
      write(c, 'PayPal', 34, 64, { size: 40, weight: 800, colour: PAPER_CSS })
      write(c, 'SANDBOX · THE RECORD', w - 34, 60, { size: 19, colour: 'rgba(243,241,236,0.6)', align: 'right', mono: true })
      PAYPAL.forEach(([what, amount, at], index) => {
        c.globalAlpha = smooth(at, at + 0.3, t) * gone
        const y = 112 + index * 54
        tick(c, 50, y + 6, 12)
        write(c, what, 78, y + 14, { size: 23, colour: PAPER_CSS })
        write(c, amount, w - 34, y + 14, { size: 23, colour: PAPER_CSS, align: 'right', mono: true })
      })
      c.globalAlpha = 1
      c.fillStyle = '#2f6fdb'
      c.fillRect(0, h - 8, w, 8)
    })
  }

  // The hold: a ring that closes when PayPal authorizes it, and at the end shows the part taken and the part released.
  const drawHold = (t) => {
    const formed = smooth(11.0, 12.2, t)
    const split = smooth(33.4, 34.8, t)
    const shown = Math.min(1, formed * 4) * (1 - smooth(38, 39.2, t))
    hold.mesh.material.opacity = shown
    hold.paint((c, w, h) => {
      const start = -Math.PI / 2
      const ring = (from, to, colour, thick, glow) => {
        c.beginPath()
        c.arc(w / 2, h / 2, w * 0.36, start + from * Math.PI * 2, start + to * Math.PI * 2)
        c.strokeStyle = colour
        c.lineWidth = thick
        c.shadowColor = colour
        c.shadowBlur = glow
        c.stroke()
        c.shadowBlur = 0
      }
      const takenTo = TAKEN_SHARE * split
      // What is still reserved is green and bright; what is released thins to an outline; what is taken turns rust.
      ring(takenTo, formed, split > 0.5 ? 'rgba(126,231,180,0.55)' : '#7ee7b4', 22 - 16 * split, 30 - 24 * split)
      if (split > 0) ring(0, takenTo, RUST_CSS, 24, 26)
      const settled = split > 0.6
      write(c, settled ? TAKEN : HOLD, w / 2, h / 2 + 4, { size: 62, weight: 800, colour: PAPER_CSS, align: 'center' })
      write(c, settled ? `TAKEN · ${RELEASED} RELEASED` : 'HELD · NOT CHARGED', w / 2, h / 2 + 48, { size: settled ? 19 : 22, colour: settled ? '#f0a27e' : '#7ee7b4', align: 'center', mono: true })
    })
  }

  const serverAt = server.mesh.position
  const paypalAt = paypal.mesh.position
  const walking = new THREE.Vector3()

  return function draw(frame) {
    const t = frame / FRAMES_PER_SECOND
    place(t)
    camera.position.copy(stand)
    camera.lookAt(look)
    if (!tall) camera.setViewOffset(width, height, -width * 0.18, 0, width, height)

    // Jonas comes round the counter for the handover and goes back behind it before the loop ends.
    const out = smooth(HAND_OVER - 1.2, HAND_OVER + 0.2, t) * (1 - smooth(36.4, 38.4, t))
    jonas.position.lerpVectors(atCounter, atCar, out)
    jonas.position.y = Math.abs(Math.sin(out * Math.PI * 5)) * 0.03 * (out > 0 && out < 1 ? 1 : 0)
    jonas.rotation.y = -0.42 + out * -0.5
    jonasScreen.mesh.position.copy(jonas.position).add(walking.set(-0.62, 1.42, 0.3))
    priya.position.y = Math.sin(t * 1.3) * 0.006
    tomas.position.y = Math.sin(t * 1.1 + 1) * 0.006

    drawPriya(t)
    drawJonas(t)
    drawTomas(t)
    drawServer(t)
    drawPayPal(t)
    drawHold(t)
    for (const each of screens) each.mesh.quaternion.copy(camera.quaternion)
    hold.mesh.quaternion.copy(camera.quaternion)

    // One call at a time travels: the assistant's to Hold's server, then Hold's to PayPal.
    const call = CALLS.find(([, at]) => t >= at && t < at + CALL_TAKES)
    const asked = PAYPAL.find(([, , at]) => t >= at - CALL_TAKES && t < at)
    if (call !== undefined) send(priyaScreen.mesh.position, serverAt, (t - call[1]) / CALL_TAKES)
    else if (asked !== undefined) send(serverAt, paypalAt, (t - (asked[2] - CALL_TAKES)) / CALL_TAKES / 2)
    else send(serverAt, paypalAt, 0)

    // The walk round the car: the frame sits on the view being taken, and each photograph leaves a mark.
    const count = taken(t)
    const walkingNow = t >= WALK.from && count < VIEWS.length
    const since = (t - WALK.from) / WALK.each - count
    if (walkingNow) aim.group.position.set(...VIEWS[count][1])
    aim.group.quaternion.copy(camera.quaternion)
    aim.reach(0.3 - 0.08 * smooth(0, 0.7, since))
    white.opacity = walkingNow ? 0.95 : 0
    flash.position.copy(aim.group.position)
    flash.scale.setScalar(0.9)
    flash.material.opacity = walkingNow ? smooth(0.7, 0.9, since) * (1 - smooth(0.9, 1, since)) * 0.9 : 0
    const pinsGone = 1 - smooth(RETURN - 0.6, RETURN, t)
    pins.forEach((pin, index) => { pin.material.opacity = index < count ? 0.9 * pinsGone : 0 })

    // The return: the car comes back with the scratch, the sheet crosses it, and the brackets close on what is new.
    const back = smooth(RETURN, RETURN + 0.4, t) * (1 - smooth(38, 39.2, t))
    scratch.material.opacity = back * 0.9
    flake.material.opacity = back * 0.9
    const crossing = (t - (RETURN + 0.6)) / 2.9
    const scanning = crossing > 0 && crossing < 1
    const x = 2.7 - Math.min(1, Math.max(0, crossing)) * 5.4
    const edge = scanning ? Math.min(1, crossing * 8, (1 - crossing) * 8) : 0
    sheet.position.x = x
    sheet.material.opacity = edge * 0.75
    sweep.position.set(x, 1.1, 1.7)
    sweep.intensity = edge * 5
    const closing = smooth(RETURN + 2.2, RETURN + 3.6, t)
    rust.opacity = smooth(RETURN + 2.0, RETURN + 2.6, t) * (1 - smooth(SETTLE + 1.2, SETTLE + 2.2, t))
    found.reach(0.42 - 0.27 * closing)
    found.group.quaternion.copy(camera.quaternion)
    finding.mesh.material.opacity = smooth(RETURN + 3.4, RETURN + 4.0, t) * (1 - smooth(SETTLE + 1.2, SETTLE + 2.2, t))

    renderer.render(scene, camera)
  }
}
