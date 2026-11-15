// The film behind the home page: a coupé of Hold's own drawing, modelled here in code, scanned by a sheet of light,
// with brackets that close on a scratch in its door. No photograph, model or badge from anyone else is in it
// (public/images/CREDITS.md). render.mjs draws it frame by frame; the loop is FRAMES long and ends where it begins.
import * as THREE from 'three'

export const FRAMES = 360
export const FRAMES_PER_SECOND = 30

// Hold's own colours, as the site's tokens name them.
const RUST = 0xd9541e
const PAPER = 0xf3f1ec
const PAINT = 0x1437c8
const NIGHT = 0x0b0a09

// The car, in metres: x runs from the tail to the nose, y up from the ground, z across.
const HALF_LENGTH = 2.32
const HALF_WIDTH = 0.96
const WHEEL_RADIUS = 0.372
const AXLES = [1.44, -1.38]
const TRACK = 0.835
// The arch cut in each flank, and how far in its liner sits.
const ARCH_RADIUS = WHEEL_RADIUS + 0.062
const ARCH_DEPTH = TRACK - 0.165

const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// A smooth line through points given as [x, value], read at any x.
function line(points) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, value]) => new THREE.Vector3(x, value, 0)), false, 'centripetal')
  const samples = curve.getSpacedPoints(400)
  return (x) => {
    let low = 0
    let high = samples.length - 1
    while (high - low > 1) {
      const middle = (low + high) >> 1
      if (samples[middle].x < x) low = middle
      else high = middle
    }
    const a = samples[low]
    const b = samples[high]
    const t = b.x === a.x ? 0 : Math.min(1, Math.max(0, (x - a.x) / (b.x - a.x)))
    return a.y + (b.y - a.y) * t
  }
}

// A skin stretched over cross-sections: each station along the car gives a ring of points, from the keel round one
// side to the crown and back down the other.
function loft(stations, ring, section) {
  const positions = []
  const indices = []
  for (let i = 0; i <= stations; i += 1) {
    for (let j = 0; j <= ring; j += 1) {
      const point = section(i / stations, j / ring)
      positions.push(point.x, point.y, point.z)
    }
  }
  const row = ring + 1
  for (let i = 0; i < stations; i += 1) {
    for (let j = 0; j < ring; j += 1) {
      const a = i * row + j
      const b = a + row
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

// A rounded box section: |cos|^e and |sin|^e with e under one square the corners off.
const power = (value, exponent) => Math.sign(value) * Math.abs(value) ** exponent

// The body below the glass: bonnet, flanks, boot. Its top, its keel and its half-width are three lines along the car.
const bodyTop = line([[-2.32, 0.66], [-2.22, 0.83], [-1.9, 0.9], [-1.2, 0.915], [0, 0.9], [0.95, 0.875], [1.5, 0.8], [2.0, 0.69], [2.24, 0.6], [2.32, 0.5]])
const bodyKeel = line([[-2.32, 0.44], [-2.15, 0.27], [-1.8, 0.17], [0, 0.145], [1.8, 0.16], [2.15, 0.24], [2.32, 0.4]])
const bodyHalfWidth = (x) => {
  const u = x / HALF_LENGTH
  // Widest over the rear wheels, drawn in at the waist, narrower at the nose than at the tail.
  const plan = 1 - 0.03 * Math.cos((x - 0.1) * 1.5) - (u > 0 ? 0.3 : 0.2) * Math.abs(u) ** 3.4
  return HALF_WIDTH * plan
}
// Both ends are rounded off over their last 26 centimetres.
const endRound = (x) => {
  const from = HALF_LENGTH - 0.26
  const beyond = Math.max(0, Math.abs(x) - from) / 0.26
  return Math.sqrt(Math.max(0, 1 - beyond * beyond * 0.985))
}

// A point of the body's skin: where along the car, and how far round its section, from the keel (-90 degrees) up the
// near flank, over the top and down the far one. `out` lifts the point off the skin, for what is laid on it.
function bodyPoint(x, angle, out = 0) {
  const round = endRound(x)
  const top = bodyTop(x)
  const keel = bodyKeel(x)
  const middle = (top + keel) / 2
  const halfHeight = ((top - keel) / 2) * (0.35 + 0.65 * round)
  // The flank is nearly upright, with a firm shoulder above it and a tuck under the sill.
  let z = (bodyHalfWidth(x) * round + out) * power(Math.cos(angle), 0.36)
  const y = middle + (halfHeight + out) * power(Math.sin(angle), 0.56)
  // The wheel arches: inside each, the flank steps in to the liner.
  for (const axle of AXLES) if (Math.hypot(x - axle, y - WHEEL_RADIUS) < ARCH_RADIUS) z = Math.sign(z) * Math.min(Math.abs(z), ARCH_DEPTH)
  return new THREE.Vector3(x, y, z)
}

const bodyGeometry = () => loft(420, 120, (s, t) => bodyPoint(-HALF_LENGTH + s * 2 * HALF_LENGTH, -Math.PI / 2 + t * Math.PI * 2))

// A strip laid on the skin: a lamp, a shut line.
const strip = (fromX, toX, fromAngle, toAngle, out = 0.004) => loft(Math.max(2, Math.ceil(Math.abs(toX - fromX) * 60)), 28, (s, t) => bodyPoint(fromX + s * (toX - fromX), fromAngle + t * (toAngle - fromAngle), out))

// The glasshouse: from the foot of the windscreen, over the roof, down the long rear glass.
const CABIN = { from: -1.86, to: 1.08 }
const roofLine = line([[-1.86, 0.9], [-1.5, 1.02], [-0.9, 1.19], [-0.3, 1.262], [0.2, 1.268], [0.55, 1.2], [0.85, 1.02], [1.08, 0.86]])
const cabinHalfWidth = (x) => 0.8 * (1 - 0.1 * Math.abs((x + 0.3) / 1.5) ** 2.4)

function cabinPoint(x, t, grow = 0) {
  const base = bodyTop(x) - 0.05
  const height = Math.max(0.001, roofLine(x) - base) + grow
  const angle = t * Math.PI
  // Tumblehome: the glass leans in as it rises, and the roof is a shallow crown.
  const z = (cabinHalfWidth(x) + grow) * power(Math.cos(angle), 0.7)
  const y = base + height * Math.abs(Math.sin(angle)) ** 0.56
  return new THREE.Vector3(x, y, z)
}

const cabinGeometry = () => loft(110, 56, (s, t) => cabinPoint(CABIN.from + s * (CABIN.to - CABIN.from), t))

// The painted roof and its pillars: the crown of the glasshouse, a hair outside the glass.
function roofGeometry() {
  const from = -1.02
  const to = 0.5
  return loft(60, 40, (s, t) => cabinPoint(from + s * (to - from), 0.2 + t * 0.6, 0.006))
}

function wheel(materials) {
  const group = new THREE.Group()
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_RADIUS - 0.07, 0.07, 32, 96), materials.tyre)
  tyre.scale.z = 1.55
  group.add(tyre)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.292, 0.292, 0.2, 72, 1, true), materials.rimDark)
  barrel.rotation.x = Math.PI / 2
  group.add(barrel)
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.296, 0.011, 16, 96), materials.rim)
  lip.position.z = 0.1
  group.add(lip)
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.02, 64), materials.disc)
  disc.rotation.x = Math.PI / 2
  disc.position.z = 0.03
  group.add(disc)
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.19, 0.05), materials.caliper)
  caliper.position.set(-0.19, 0.03, 0.05)
  group.add(caliper)
  // Five pairs of spokes, each a blade from the hub to the lip, proud of the disc.
  for (let spoke = 0; spoke < 5; spoke += 1) {
    for (const lean of [-0.13, 0.13]) {
      const turn = (spoke / 5) * Math.PI * 2 + lean
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.262, 0.03, 0.026), materials.rim)
      blade.position.set(Math.cos(turn) * 0.158, Math.sin(turn) * 0.158, 0.098)
      blade.rotation.z = turn
      group.add(blade)
    }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.034, 40), materials.rim)
  hub.rotation.x = Math.PI / 2
  hub.position.z = 0.108
  group.add(hub)
  return group
}

// A soft-edged picture drawn on a canvas, for the floor, the shadow and the label.
function drawn(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function car(materials) {
  const group = new THREE.Group()
  group.add(new THREE.Mesh(bodyGeometry(), materials.paint))
  group.add(new THREE.Mesh(cabinGeometry(), materials.glass))
  group.add(new THREE.Mesh(roofGeometry(), materials.paint))

  for (const x of AXLES) {
    for (const side of [1, -1]) {
      // The liner at the back of each arch, and the wheel in front of it.
      const liner = new THREE.Mesh(new THREE.CircleGeometry(ARCH_RADIUS + 0.03, 72, -0.3, Math.PI + 0.6), materials.well)
      liner.position.set(x, WHEEL_RADIUS, side * (ARCH_DEPTH - 0.004))
      if (side === -1) liner.rotation.y = Math.PI
      group.add(liner)
      // The lip of the arch, a dark moulding where the flank is cut.
      const lip = new THREE.Mesh(new THREE.TorusGeometry(ARCH_RADIUS, 0.024, 16, 72, Math.PI + 0.5), materials.well)
      lip.rotation.z = -0.25
      lip.scale.z = 2.4
      lip.position.set(x, WHEEL_RADIUS, side * (bodyHalfWidth(x) - 0.052))
      group.add(lip)
      const turning = wheel(materials)
      turning.position.set(x, WHEEL_RADIUS, side * TRACK)
      if (side === -1) turning.rotation.y = Math.PI
      group.add(turning)
    }
  }

  // Lamps, laid on the skin: a blade of light at each corner of the nose, one bar across the tail.
  for (const side of [1, -1]) {
    const from = side === 1 ? 0.6 : Math.PI - 0.6
    const to = side === 1 ? 0.84 : Math.PI - 0.84
    group.add(new THREE.Mesh(strip(1.98, 2.21, from, to), materials.headlamp))
  }
  group.add(new THREE.Mesh(strip(-2.272, -2.225, 0.34, Math.PI - 0.34), materials.tail))
  for (const side of [1, -1]) {
    // A mirror on a short stalk at the foot of the windscreen.
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.06, 28, 18), materials.paint)
    mirror.scale.set(1.5, 0.62, 0.8)
    mirror.position.set(0.9, bodyTop(0.9) + 0.035, side * (cabinHalfWidth(0.9) + 0.105))
    group.add(mirror)
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.1), materials.well)
    stalk.position.set(0.9, bodyTop(0.9) + 0.012, side * (cabinHalfWidth(0.9) + 0.04))
    group.add(stalk)
    // The shut lines of the door, and the dark sill between the wheels.
    const flank = side === 1 ? [-1.05, 0.86] : [Math.PI + 1.05, Math.PI - 0.86]
    for (const x of [0.86, -0.36]) group.add(new THREE.Mesh(strip(x, x + 0.007, flank[0], flank[1], 0.002), materials.shut))
    const sill = side === 1 ? [-1.32, -0.98] : [Math.PI + 1.32, Math.PI + 0.98]
    group.add(new THREE.Mesh(strip(AXLES[1] + ARCH_RADIUS + 0.03, AXLES[0] - ARCH_RADIUS - 0.03, sill[0], sill[1], 0.003), materials.well))
  }
  return group
}

export function createFilm(canvas, { width, height }) {
  const tall = height > width
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(NIGHT)
  scene.fog = new THREE.Fog(NIGHT, 9, 26)
  const pmrem = new THREE.PMREMGenerator(renderer)
  // What the paint reflects: a dark studio with a long soft box overhead, a strip of light down each side, and the
  // warm colour of the scan behind the car.
  const studio = new THREE.Scene()
  studio.background = new THREE.Color(0x020203)
  const lit = (colour, strength) => new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(strength), side: THREE.DoubleSide })
  const box = (w, h, material, position, rotation) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material)
    panel.position.set(...position)
    panel.rotation.set(...rotation)
    studio.add(panel)
  }
  box(11, 2.6, lit(0xffffff, 5.5), [0, 6, 0.6], [Math.PI / 2, 0, 0])
  box(12, 0.5, lit(0xdfe8ff, 7), [0, 2.1, 6.5], [0, Math.PI, 0])
  box(12, 0.7, lit(0xdfe8ff, 8), [0, 0.8, 7], [0, Math.PI, 0])
  box(12, 0.5, lit(0xdfe8ff, 5), [0, 2.3, -6.5], [0, 0, 0])
  box(3, 2.2, lit(0xff7a3c, 3.4), [-8, 1.6, -2], [0, Math.PI / 2, 0])
  box(3, 1.6, lit(0xffffff, 2.4), [8, 1.8, 1.5], [0, -Math.PI / 2, 0])
  scene.environment = pmrem.fromScene(studio, 0.03).texture
  scene.environmentIntensity = 1

  const materials = {
    paint: new THREE.MeshPhysicalMaterial({ color: PAINT, metalness: 0.78, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1.5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x05070b, metalness: 0.95, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.9 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.86, metalness: 0.02 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.22, metalness: 0.95 }),
    rimDark: new THREE.MeshStandardMaterial({ color: 0x25272b, roughness: 0.4, metalness: 0.85, side: THREE.DoubleSide }),
    disc: new THREE.MeshStandardMaterial({ color: 0x74777d, roughness: 0.35, metalness: 0.9 }),
    caliper: new THREE.MeshStandardMaterial({ color: RUST, roughness: 0.45, metalness: 0.3 }),
    well: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95, metalness: 0 }),
    shut: new THREE.MeshBasicMaterial({ color: 0x06070b }),
    headlamp: new THREE.MeshBasicMaterial({ color: 0xfff6e6 }),
    tail: new THREE.MeshBasicMaterial({ color: 0xff3b1f }),
  }
  const coupe = car(materials)
  scene.add(coupe)

  // The floor: dark and unlit, with the dot grid of the site, so the words laid over the film stay readable.
  const floorMap = drawn(1024, 1024, (context, w, h) => {
    context.fillStyle = '#0e0d0c'
    context.fillRect(0, 0, w, h)
    context.fillStyle = 'rgba(217, 84, 30, 0.34)'
    for (let x = 0; x < 16; x += 1) for (let y = 0; y < 16; y += 1) {
      context.beginPath()
      context.arc(32 + x * 64, 32 + y * 64, 3.2, 0, Math.PI * 2)
      context.fill()
    }
  })
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping
  floorMap.repeat.set(9, 9)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: floorMap }))
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // What the car stands on: a soft shadow, and the warm pool of light under its sill.
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 3.4),
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      map: drawn(512, 256, (context, w, h) => {
        const fade = context.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2)
        fade.addColorStop(0, 'rgba(0,0,0,0.92)')
        fade.addColorStop(0.55, 'rgba(0,0,0,0.6)')
        fade.addColorStop(1, 'rgba(0,0,0,0)')
        context.fillStyle = fade
        context.fillRect(0, 0, w, h)
      }),
    }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.004
  scene.add(shadow)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 4.6),
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: drawn(256, 256, (context, w, h) => {
        const fade = context.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2)
        fade.addColorStop(0, 'rgba(217,84,30,0.42)')
        fade.addColorStop(1, 'rgba(217,84,30,0)')
        context.fillStyle = fade
        context.fillRect(0, 0, w, h)
      }),
    }),
  )
  glow.rotation.x = -Math.PI / 2
  glow.position.set(-0.2, 0.006, 1.5)
  scene.add(glow)

  // A still night behind it.
  const stars = new THREE.BufferGeometry()
  const scatter = []
  let seed = 7
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let star = 0; star < 520; star += 1) {
    const turn = random() * Math.PI * 2
    const rise = 0.06 + random() * 0.9
    const far = 30 + random() * 14
    scatter.push(Math.cos(turn) * far, rise * 20, Math.sin(turn) * far)
  }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(scatter, 3))
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xbfc6d4, size: 0.085, sizeAttenuation: true, transparent: true, opacity: 0.75, fog: false })))

  scene.add(new THREE.HemisphereLight(0x9fb0d8, 0x120c08, 0.6))
  const key = new THREE.DirectionalLight(0xffffff, 1.1)
  key.position.set(4, 7, 6)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xff8a50, 1.2)
  rim.position.set(-6, 3, -5)
  scene.add(rim)
  // The lamps' own light: a halo at each, and a faint pool on the floor ahead of the nose.
  const halo = drawn(128, 128, (context, w, h) => {
    const fade = context.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2)
    fade.addColorStop(0, 'rgba(255,246,226,0.95)')
    fade.addColorStop(0.25, 'rgba(255,226,186,0.4)')
    fade.addColorStop(1, 'rgba(255,226,186,0)')
    context.fillStyle = fade
    context.fillRect(0, 0, w, h)
  })
  for (const side of [1, -1]) {
    const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }))
    lamp.scale.set(0.62, 0.3, 1)
    lamp.position.copy(bodyPoint(2.12, side === 1 ? 0.74 : Math.PI - 0.74, 0.03))
    scene.add(lamp)
  }
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.4), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.16 }))
  pool.rotation.x = -Math.PI / 2
  pool.position.set(4.4, 0.007, 0)
  scene.add(pool)

  // The sheet of light that reads the car from nose to tail.
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 1.75),
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      map: drawn(256, 256, (context, w, h) => {
        // Brightest where it meets the floor, fading up and out to its edges.
        const up = context.createLinearGradient(0, h, 0, 0)
        up.addColorStop(0, 'rgba(255,236,214,0.85)')
        up.addColorStop(0.08, 'rgba(255,190,140,0.42)')
        up.addColorStop(1, 'rgba(255,170,120,0)')
        context.fillStyle = up
        context.fillRect(0, 0, w, h)
        context.globalCompositeOperation = 'destination-in'
        const across = context.createLinearGradient(0, 0, w, 0)
        across.addColorStop(0, 'rgba(0,0,0,0)')
        across.addColorStop(0.18, 'rgba(0,0,0,1)')
        across.addColorStop(0.82, 'rgba(0,0,0,1)')
        across.addColorStop(1, 'rgba(0,0,0,0)')
        context.fillStyle = across
        context.fillRect(0, 0, w, h)
      }),
    }),
  )
  // Upright and square to the car, so it crosses it like the bar of a scanner.
  sheet.rotation.y = Math.PI / 2
  sheet.position.y = 0.875
  scene.add(sheet)
  const sweep = new THREE.PointLight(0xffb48a, 0, 4.5, 1.6)
  scene.add(sweep)

  // The scratch in the driver's door, and what closes on it: four corners, a ring, and a card with the finding.
  const door = bodyPoint(0.24, 0.16, 0.003)
  const scratch = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.012), new THREE.MeshBasicMaterial({ color: 0xe9edf5, transparent: true, opacity: 0.9 }))
  scratch.position.copy(door)
  scratch.rotation.z = -0.16
  coupe.add(scratch)
  const flake = scratch.clone()
  flake.scale.set(0.4, 0.7, 1)
  flake.position.add(new THREE.Vector3(0.09, -0.03, 0))
  flake.rotation.z = -0.3
  coupe.add(flake)

  const marks = new THREE.Group()
  marks.position.copy(door).add(new THREE.Vector3(0, 0, 0.03))
  scene.add(marks)
  const ink = new THREE.MeshBasicMaterial({ color: RUST, transparent: true, depthTest: false })
  const corners = []
  for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const corner = new THREE.Group()
    const flat = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.012), ink)
    flat.position.x = -x * 0.05
    const upright = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.1), ink)
    upright.position.y = -y * 0.05
    corner.add(flat, upright)
    corner.userData.toward = new THREE.Vector2(x, y)
    corners.push(corner)
    marks.add(corner)
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.097, 64), ink)
  marks.add(ring)
  const leader = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.46), new THREE.MeshBasicMaterial({ color: RUST, transparent: true, opacity: 0.7, depthTest: false }))
  leader.position.set(0.2, 0.36, 0)
  leader.rotation.z = -0.5
  marks.add(leader)
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.3),
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthTest: false,
      map: drawn(520, 200, (context, w, h) => {
        context.fillStyle = 'rgba(14,13,12,0.86)'
        context.fillRect(0, 0, w, h)
        context.strokeStyle = 'rgba(217,84,30,0.9)'
        context.lineWidth = 3
        context.strokeRect(1.5, 1.5, w - 3, h - 3)
        // The finding in Hold's own marks, with no words to translate: what was found, and how sure.
        context.fillStyle = '#d9541e'
        context.fillRect(34, 48, 290, 22)
        context.fillStyle = 'rgba(243,241,236,0.62)'
        context.fillRect(34, 112, 380, 16)
        context.fillStyle = '#f3f1ec'
        context.beginPath()
        context.arc(w - 58, 60, 19, 0, Math.PI * 2)
        context.fill()
      }),
    }),
  )
  card.position.set(0.56, 0.72, 0)
  marks.add(card)
  for (const drawnOver of [...corners.flatMap((corner) => corner.children), ring, leader, card]) drawnOver.renderOrder = 10

  const camera = new THREE.PerspectiveCamera(tall ? 38 : 27, width / height, 0.1, 80)
  // On a wide screen the words sit on the left, so the car is framed to the right; on a tall one it is centred.
  const look = tall ? new THREE.Vector3(0.45, -1.55, 0) : new THREE.Vector3(0.25, 0.5, 0)

  return function draw(frame) {
    const turn = (frame / FRAMES) * Math.PI * 2
    // The camera drifts round the driver's side and back, so the last frame meets the first.
    const around = (tall ? 1.16 : 0.82) + (tall ? 0.1 : 0.17) * Math.sin(turn)
    const distance = tall ? 11.4 : 10.6
    const lift = (tall ? 2.0 : 1.5) + 0.14 * Math.cos(turn)
    camera.position.set(look.x + Math.sin(around) * distance, lift, look.z + Math.cos(around) * distance)
    camera.lookAt(look)
    if (!tall) camera.setViewOffset(width, height, -width * 0.235, -height * 0.04, width, height)

    // The sheet crosses the car between frames 24 and 150, from the nose to the tail.
    const crossing = (frame - 24) / 126
    const scanning = crossing > 0 && crossing < 1
    const x = 2.7 - Math.min(1, Math.max(0, crossing)) * 5.4
    const edge = scanning ? Math.min(1, crossing * 8, (1 - crossing) * 8) : 0
    sheet.position.x = x
    sheet.material.opacity = edge * 0.75
    sweep.position.set(x, 1.1, 1.7)
    sweep.intensity = edge * 5

    // The brackets appear as the sheet passes the door, close by frame 186, hold, and let go before the loop ends.
    const shown = smooth(118, 150, frame) * (1 - smooth(300, 344, frame))
    const closed = smooth(138, 186, frame)
    const reach = 0.42 - 0.27 * closed
    for (const corner of corners) corner.position.set(corner.userData.toward.x * reach, corner.userData.toward.y * reach, 0)
    ink.opacity = shown
    ring.scale.setScalar(1.9 - 0.9 * closed)
    const told = smooth(160, 186, frame) * (1 - smooth(300, 344, frame))
    leader.material.opacity = told * 0.7
    card.material.opacity = told
    marks.quaternion.copy(camera.quaternion)
    scratch.material.opacity = 0.35 + 0.55 * smooth(110, 150, frame)
    flake.material.opacity = scratch.material.opacity

    renderer.render(scene, camera)
  }
}
