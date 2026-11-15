import { createHash } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { captureSession, conditionReport, recordPhoto, recordReading, sealSession, startCaptureSession } from './capture-repository.ts'
import { saveSelfReturnSettings, selfReturnFor, startSelfReturn } from './self-return-repository.ts'
import { createTestDatabase } from './testing/test-database.ts'
import type { TestDatabase } from './testing/test-database.ts'
import { readyRentalShop } from './testing/ready-rental.ts'
import type { ReadyRentalShop } from './testing/ready-rental.ts'

// A vehicle's dashboard at handover and at return (docs/vehicle-plan.md step 3, part B): the kilometres and the fuel,
// entered by a person, checked by plain code and sealed with the photographs. No other kind of item is asked.

const NOW = new Date('2026-11-15T09:00:00Z')
const sha = (text: string) => createHash('sha256').update(text).digest('hex')
const QUALITY = { sharpness: 120, shadows: 20, highlights: 220, filled: 0.6 }
const FULL = { odometerKm: 48_210, fuelEighths: 8 }

let database: TestDatabase
let cars: ReadyRentalShop
let bikes: ReadyRentalShop

async function started(shop: ReadyRentalShop, kind: 'handover' | 'return', rental?: { readonly rentalId: string; readonly rentalItemIds: readonly string[] }) {
  const of = rental ?? (await shop.readyRental())
  const session = await shop.act((transaction) => startCaptureSession(transaction, { rentalId: of.rentalId, rentalItemId: of.rentalItemIds[0] ?? '', kind, actorUserId: shop.scope.userId ?? null }, NOW))
  if (!session.ok) throw new Error(session.reason)
  for (const view of ['left-side', 'right-side']) {
    const recorded = await shop.act((transaction) => recordPhoto(transaction, session.sessionId, { view, evidenceKey: `evidence/${kind}-${view}-${String(Math.random()).slice(2)}.jpg`, sha256: sha(`${kind}-${view}-${session.sessionId}`), quality: QUALITY }, NOW))
    if (!recorded.ok) throw new Error(recorded.reason)
  }
  return { ...of, sessionId: session.sessionId }
}

// A car handed over full at 48,210 km, and its return started.
async function returning() {
  const handover = await started(cars, 'handover')
  await cars.act((transaction) => recordReading(transaction, handover.sessionId, FULL))
  const sealed = await cars.act((transaction) => sealSession(transaction, handover.sessionId, NOW))
  if (!sealed.ok) throw new Error(sealed.reason)
  return started(cars, 'return', handover)
}

beforeAll(async () => {
  database = await createTestDatabase()
  cars = await readyRentalShop(database, 'cars', NOW, 'car')
  bikes = await readyRentalShop(database, 'bikes', NOW)
})

describe('a vehicle’s handover', () => {
  it('is not sealed until its dashboard has been read, however complete its photographs', async () => {
    const { sessionId } = await started(cars, 'handover')
    expect(await cars.act((transaction) => captureSession(transaction, sessionId))).toMatchObject({ takesReadings: true, reading: null })
    expect(await cars.act((transaction) => sealSession(transaction, sessionId, NOW))).toEqual({ ok: false, reason: 'reading_missing' })
  })

  it('takes the reading a person entered, refuses one that cannot be, and seals it with the photographs', async () => {
    const { sessionId, rentalId } = await started(cars, 'handover')
    expect(await cars.act((transaction) => recordReading(transaction, sessionId, { odometerKm: -4, fuelEighths: 9 }))).toEqual({ ok: false, reason: 'reading_invalid', problems: ['odometer_invalid', 'fuel_invalid'] })
    expect(await cars.act((transaction) => recordReading(transaction, sessionId, FULL))).toEqual({ ok: true })
    const sealed = await cars.act((transaction) => sealSession(transaction, sessionId, NOW))
    expect(sealed).toMatchObject({ ok: true, rentalOut: true })
    const session = await cars.act((transaction) => captureSession(transaction, sessionId))
    expect(session).toMatchObject({ reading: FULL })
    // The renter reads it on the condition report, beside the photographs it was read from.
    expect((await cars.act((transaction) => conditionReport(transaction, rentalId, NOW)))?.items[0]).toMatchObject({ reading: FULL })
    // Sealed means sealed: the reading is in the manifest, and is not entered again.
    expect(await cars.act((transaction) => recordReading(transaction, sessionId, { odometerKm: 1, fuelEighths: 1 }))).toEqual({ ok: false, reason: 'sealed' })
  })

  it('finds nothing in another shop', async () => {
    const { sessionId } = await started(cars, 'handover')
    expect(await bikes.act((transaction) => recordReading(transaction, sessionId, FULL))).toEqual({ ok: false, reason: 'not_found' })
  })
})

describe('a vehicle’s return', () => {
  it('shows the handover’s reading beside its own, and refuses an odometer that reads less', async () => {
    const { sessionId } = await returning()
    expect(await cars.act((transaction) => captureSession(transaction, sessionId))).toMatchObject({ takesReadings: true, reading: null, handoverReading: FULL })
    expect(await cars.act((transaction) => recordReading(transaction, sessionId, { odometerKm: 48_209, fuelEighths: 8 }))).toEqual({ ok: false, reason: 'reading_invalid', problems: ['odometer_below_handover'] })
    expect(await cars.act((transaction) => sealSession(transaction, sessionId, NOW))).toEqual({ ok: false, reason: 'reading_missing' })
    expect(await cars.act((transaction) => recordReading(transaction, sessionId, { odometerKm: 48_930, fuelEighths: 5 }))).toEqual({ ok: true })
    expect(await cars.act((transaction) => sealSession(transaction, sessionId, NOW))).toMatchObject({ ok: true })
  })
})

describe('an item that is not driven', () => {
  it('is never asked for a reading, takes none, and is sealed as it always was', async () => {
    const { sessionId } = await started(bikes, 'handover')
    expect(await bikes.act((transaction) => captureSession(transaction, sessionId))).toMatchObject({ takesReadings: false, reading: null })
    expect(await bikes.act((transaction) => recordReading(transaction, sessionId, FULL))).toEqual({ ok: false, reason: 'not_read' })
    expect(await bikes.act((transaction) => sealSession(transaction, sessionId, NOW))).toMatchObject({ ok: true })
  })
})

describe('a vehicle the renter would return alone', () => {
  it('is offered the renter’s own return like anything else, and tells the page its dashboard is to be read', async () => {
    await cars.act((transaction) => saveSelfReturnSettings(transaction, cars.scope.shopId, { allowed: true, dropPoint: 'The marked bay behind the office', hours: null }))
    const handover = await started(cars, 'handover')
    await cars.act((transaction) => recordReading(transaction, handover.sessionId, FULL))
    await cars.act((transaction) => sealSession(transaction, handover.sessionId, NOW))
    expect(await cars.act((transaction) => startSelfReturn(transaction, handover.rentalId, NOW))).toMatchObject({ ok: true })
    expect((await cars.act((transaction) => selfReturnFor(transaction, handover.rentalId)))?.items[0]).toMatchObject({ takesReadings: true, reading: null, handoverReading: FULL })
  })

  it('asks no reading of the renter of an item that is not driven', async () => {
    await bikes.act((transaction) => saveSelfReturnSettings(transaction, bikes.scope.shopId, { allowed: true, dropPoint: 'The rack by the door', hours: null }))
    const handover = await started(bikes, 'handover')
    await bikes.act((transaction) => sealSession(transaction, handover.sessionId, NOW))
    expect(await bikes.act((transaction) => startSelfReturn(transaction, handover.rentalId, NOW))).toMatchObject({ ok: true })
    expect((await bikes.act((transaction) => selfReturnFor(transaction, handover.rentalId)))?.items[0]).toMatchObject({ takesReadings: false, reading: null })
  })
})
