import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { recordPhoto, recordReading, sealSession, startCaptureSession } from './capture-repository.ts'
import { draftClaim } from './claim-repository.ts'
import { readingCharges } from './reading-charges.ts'
import { claimLines, itemTypes, rentalItems } from './schema/index.ts'
import { createTestDatabase } from './testing/test-database.ts'
import type { TestDatabase } from './testing/test-database.ts'
import { INCLUDED_KM_PER_DAY, readyRentalShop } from './testing/ready-rental.ts'
import type { ReadyRentalShop } from './testing/ready-rental.ts'

// What a vehicle's two readings are charged (docs/vehicle-plan.md step 3, part C): the kilometres beyond those the
// booking includes and the eighths of a tank missing, each at the agreed list's price of one. Plain code counts and
// prices them; a person only chooses to charge them.

const NOW = new Date('2026-11-15T09:00:00Z')
const sha = (text: string) => createHash('sha256').update(text).digest('hex')
const QUALITY = { sharpness: 120, shadows: 20, highlights: 220, filled: 0.6 }

let database: TestDatabase
let cars: ReadyRentalShop
let bikes: ReadyRentalShop

async function sealed(shop: ReadyRentalShop, rental: { readonly rentalId: string; readonly rentalItemIds: readonly string[] }, kind: 'handover' | 'return', reading?: { odometerKm: number; fuelEighths: number }) {
  const session = await shop.act((transaction) => startCaptureSession(transaction, { rentalId: rental.rentalId, rentalItemId: rental.rentalItemIds[0] ?? '', kind, actorUserId: shop.scope.userId ?? null }, NOW))
  if (!session.ok) throw new Error(session.reason)
  for (const view of ['left-side', 'right-side']) await shop.act((transaction) => recordPhoto(transaction, session.sessionId, { view, evidenceKey: `evidence/${session.sessionId}-${view}.jpg`, sha256: sha(`${session.sessionId}-${view}`), quality: QUALITY }, NOW))
  if (reading !== undefined) await shop.act((transaction) => recordReading(transaction, session.sessionId, reading))
  const done = await shop.act((transaction) => sealSession(transaction, session.sessionId, NOW))
  if (!done.ok) throw new Error(done.reason)
}

// A car booked for one day, handed over full at 48,210 km and brought back as given.
async function returned(back: { odometerKm: number; fuelEighths: number }) {
  const rental = await cars.readyRental()
  await sealed(cars, rental, 'handover', { odometerKm: 48_210, fuelEighths: 8 })
  await sealed(cars, rental, 'return', back)
  return rental
}

beforeAll(async () => {
  database = await createTestDatabase()
  cars = await readyRentalShop(database, 'car-charges', NOW, 'car')
  bikes = await readyRentalShop(database, 'bike-charges', NOW)
})

describe('what a vehicle’s readings are charged', () => {
  it('is the kilometres beyond those its day includes and the fuel missing, each at the agreed price of one', async () => {
    const rental = await returned({ odometerKm: 48_930, fuelEighths: 5 })
    const [charge] = await cars.act((transaction) => readingCharges(transaction, rental.rentalId))
    expect(charge).toMatchObject({
      rentalItemId: rental.rentalItemIds[0],
      usage: { drivenKm: 720, includedKm: INCLUDED_KM_PER_DAY, excessKm: 520, missingFuelEighths: 3 },
      mileage: { unitCents: 30, quantity: 520, amountCents: 156_00 },
      fuel: { unitCents: 12_00, quantity: 3, amountCents: 36_00 },
    })
  })

  it('is nothing for a vehicle driven within its days and brought back full, and nothing at all for an item that is not driven', async () => {
    const rental = await returned({ odometerKm: 48_300, fuelEighths: 8 })
    expect(await cars.act((transaction) => readingCharges(transaction, rental.rentalId))).toMatchObject([{ usage: { excessKm: 0, missingFuelEighths: 0 }, mileage: null, fuel: null }])
    const bike = await bikes.readyRental()
    await sealed(bikes, bike, 'handover')
    await sealed(bikes, bike, 'return')
    expect(await bikes.act((transaction) => readingCharges(transaction, bike.rentalId))).toEqual([])
  })

  it('keeps the kilometres the booking included, whatever its type includes later', async () => {
    const rental = await cars.readyRental()
    const [type] = await cars.act((transaction) => transaction.select().from(itemTypes).where(eq(itemTypes.id, cars.typeId)))
    if (type === undefined) throw new Error('No type.')
    expect(await cars.act((transaction) => transaction.select({ included: rentalItems.includedKmPerDay }).from(rentalItems).where(eq(rentalItems.rentalId, rental.rentalId)))).toEqual([{ included: INCLUDED_KM_PER_DAY }])
    await cars.act((transaction) => transaction.update(itemTypes).set({ includedKmPerDay: 50 }).where(eq(itemTypes.id, cars.typeId)))
    await sealed(cars, rental, 'handover', { odometerKm: 1_000, fuelEighths: 8 })
    await sealed(cars, rental, 'return', { odometerKm: 1_150, fuelEighths: 8 })
    expect(await cars.act((transaction) => readingCharges(transaction, rental.rentalId))).toMatchObject([{ usage: { includedKm: INCLUDED_KM_PER_DAY, excessKm: 0 } }])
    await cars.act((transaction) => transaction.update(itemTypes).set({ includedKmPerDay: INCLUDED_KM_PER_DAY }).where(eq(itemTypes.id, cars.typeId)))
  })
})

describe('a claim line charged from the readings', () => {
  it('is priced by the server as the agreed unit price times what the readings say, and kept with its count', async () => {
    const rental = await returned({ odometerKm: 48_930, fuelEighths: 5 })
    const rentalItemId = rental.rentalItemIds[0] ?? ''
    const claim = await cars.act((transaction) => draftClaim(transaction, rental.rentalId, cars.scope.userId ?? '', [{ reading: 'mileage', rentalItemId }, { reading: 'fuel', rentalItemId }], NOW))
    expect(claim).toMatchObject({ ok: true, totalCents: 192_00 })
    const lines = await cars.act((transaction) => transaction.select({ source: claimLines.source, quantity: claimLines.quantity, amountCents: claimLines.amountCents }).from(claimLines))
    expect(lines.filter((line) => line.source === 'reading').map((line) => [line.quantity, line.amountCents]).sort()).toEqual(expect.arrayContaining([[3, 36_00], [520, 156_00]]))
    // Each says how it was counted, where the renter, an advocate and the evidence pack read it.
    const reasons = await cars.act((transaction) => transaction.select({ reason: claimLines.reason }).from(claimLines))
    expect(reasons.map((line) => line.reason)).toEqual(expect.arrayContaining(['48210 km → 48930 km · 720 km − 200 km = 520 km × 0.30 EUR', '8/8 → 5/8 · 3 × 12.00 EUR']))
  })

  it('is refused when the readings give nothing to charge, when asked for twice, and for another rental’s item', async () => {
    const clean = await returned({ odometerKm: 48_300, fuelEighths: 8 })
    const user = cars.scope.userId ?? ''
    expect(await cars.act((transaction) => draftClaim(transaction, clean.rentalId, user, [{ reading: 'mileage', rentalItemId: clean.rentalItemIds[0] ?? '' }], NOW))).toEqual({ ok: false, reason: 'nothing_to_charge' })
    const used = await returned({ odometerKm: 48_930, fuelEighths: 5 })
    const item = used.rentalItemIds[0] ?? ''
    expect(await cars.act((transaction) => draftClaim(transaction, used.rentalId, user, [{ reading: 'fuel', rentalItemId: item }, { reading: 'fuel', rentalItemId: item }], NOW))).toEqual({ ok: false, reason: 'duplicate_line' })
    expect(await cars.act((transaction) => draftClaim(transaction, used.rentalId, user, [{ reading: 'fuel', rentalItemId: clean.rentalItemIds[0] ?? '' }], NOW))).toEqual({ ok: false, reason: 'nothing_to_charge' })
  })
})
