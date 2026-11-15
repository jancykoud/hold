// One photograph of a car's flank, its rear door and rear wheel, taken twice (scripts/sample-photos.ts). Mark
// positions are in the photograph's own 1400 by 600 frame.
export const evidencePhoto = {
  width: 1400,
  height: 600,
  handoverSrc: '/images/flank-handover.jpg',
  returnSrc: '/images/flank-return.jpg',
  newMark: { x: 518, y: 302, size: 84 },
  oldMark: { x: 392, y: 454, size: 56 },
  thumbnailViewBox: '300 170 480 360',
  // Close views cut from the same photograph. The wheel is upright, as a phone holds it. The rest are four wide to three
  // high: `frame` is the door under its handle, `brake` the caliper behind the spokes.
  crops: {
    scratch: '440 254 240 180',
    scuff: '300 392 240 180',
    tyre: '820 250 240 180',
    brake: '930 345 200 150',
    frame: '330 0 440 330',
    wheel: '760 150 360 450',
  },
} as const

export type EvidenceCrop = keyof typeof evidencePhoto.crops
