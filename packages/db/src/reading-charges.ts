import { rentalDays, readingUsage, takesReadings, UNIT_PRICE_CATEGORIES } from '@hold/domain'
import type { Reading, ReadingUsage, UnitPriceCategory } from '@hold/domain'
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm'
import { captureSessions, items, itemTypes, photos, priceEntries, rentalItems, rentals } from './schema/index.ts'
import type { Transaction } from './scope.ts'

// What a vehicle's two readings are charged (docs/vehicle-plan.md step 3, part C). Plain code counts the kilometres
// beyond those the booking includes and the eighths of a tank missing (domain readingUsage), and prices each at the
// agreed list's price of one. Nothing here takes an amount from a person, a client or a model.

// One of the two charges: the agreed entry, its price of one, how many, and what that comes to.
export type ReadingCharge = { readonly priceEntryId: string; readonly description: string; readonly unitCents: number; readonly quantity: number; readonly amountCents: number }

export type ItemReadingCharges = {
  readonly rentalItemId: string
  readonly itemLabel: string
  readonly handover: Reading
  readonly returned: Reading
  readonly usage: ReadingUsage
  // How many sealed sessions the readings rest on with photographs: two, the handover and the return.
  readonly photoCount: number
  // None when the readings give nothing to charge, or the agreed list has no price for it.
  readonly mileage: ReadingCharge | null
  readonly fuel: ReadingCharge | null
}

type SessionReading = { readonly sessionId: string; readonly reading: Reading }

async function sealedReading(transaction: Transaction, rentalItemId: string, kind: 'handover' | 'return'): Promise<SessionReading | undefined> {
  const [session] = await transaction.select({ id: captureSessions.id, odometerKm: captureSessions.odometerKm, fuelEighths: captureSessions.fuelEighths }).from(captureSessions)
    .where(and(eq(captureSessions.rentalItemId, rentalItemId), eq(captureSessions.kind, kind), isNotNull(captureSessions.sealedAt)))
  if (session === undefined || session.odometerKm === null || session.fuelEighths === null) return undefined
  return { sessionId: session.id, reading: { odometerKm: session.odometerKm, fuelEighths: session.fuelEighths } }
}

async function photographed(transaction: Transaction, sessionId: string): Promise<boolean> {
  const [photo] = await transaction.select({ id: photos.id }).from(photos).where(and(eq(photos.sessionId, sessionId), isNull(photos.supersededAt))).limit(1)
  return photo !== undefined
}

// For each of the rental's items that is driven and has both sealed readings: what it used, and what that is charged
// from the price list the renter agreed. An item that is not driven, or not yet returned, is not here.
export async function readingCharges(transaction: Transaction, rentalId: string): Promise<readonly ItemReadingCharges[]> {
  const [rental] = await transaction.select({ startsAt: rentals.startsAt, endsAt: rentals.endsAt, priceListId: rentals.priceListId, currency: rentals.currency }).from(rentals).where(eq(rentals.id, rentalId))
  if (rental === undefined) return []
  const lines = await transaction.select({ id: rentalItems.id, label: items.label, category: itemTypes.category, includedKmPerDay: rentalItems.includedKmPerDay }).from(rentalItems)
    .innerJoin(items, eq(items.id, rentalItems.itemId)).innerJoin(itemTypes, eq(itemTypes.id, items.itemTypeId)).where(eq(rentalItems.rentalId, rentalId)).orderBy(asc(rentalItems.id))
  const agreed = await transaction.select().from(priceEntries).where(and(eq(priceEntries.priceListId, rental.priceListId), eq(priceEntries.currency, rental.currency)))
  const charged: ItemReadingCharges[] = []
  for (const line of lines) {
    if (!takesReadings(line.category)) continue
    const handover = await sealedReading(transaction, line.id, 'handover')
    const returned = await sealedReading(transaction, line.id, 'return')
    if (handover === undefined || returned === undefined) continue
    // A booking made before its type included any kilometres includes none.
    const usage = readingUsage({ handover: handover.reading, returned: returned.reading, days: rentalDays(rental.startsAt, rental.endsAt), includedKmPerDay: line.includedKmPerDay ?? 0 })
    const charge = (category: UnitPriceCategory, quantity: number): ReadingCharge | null => {
      const entry = agreed.find((each) => each.category === category)
      return entry === undefined || quantity < 1 ? null : { priceEntryId: entry.id, description: entry.description, unitCents: entry.amountCents, quantity, amountCents: entry.amountCents * quantity }
    }
    const [mileage, fuel] = UNIT_PRICE_CATEGORIES.map((category) => charge(category, category === 'mileage' ? usage.excessKm : usage.missingFuelEighths))
    const photoCount = Number(await photographed(transaction, handover.sessionId)) + Number(await photographed(transaction, returned.sessionId))
    charged.push({ rentalItemId: line.id, itemLabel: line.label, handover: handover.reading, returned: returned.reading, usage, photoCount, mileage: mileage ?? null, fuel: fuel ?? null })
  }
  return charged
}
