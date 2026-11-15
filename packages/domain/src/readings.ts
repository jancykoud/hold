import { amountText } from './currency.ts'
import type { Money } from './money.ts'
import type { ItemCategory } from './photo-plan.ts'
import type { UnitPriceCategory } from './price-list.ts'

// What a vehicle's dashboard says at handover and at return (vehicle-plan.md step 3): the kilometres on its odometer and
// the fuel in its tank. Staff enter both from the dashboard photograph, and the renter reads them on the condition
// report. Plain code works out what the rental used; no reading is ever taken from a model.

// The kinds of item that are driven. Their handover and their return each need a reading; no other kind is asked.
const READ_CATEGORIES: readonly ItemCategory[] = ['car', 'van', 'motorhome', 'motorbike']

export function takesReadings(category: ItemCategory): boolean {
  return READ_CATEGORIES.includes(category)
}

// A tank is read in eighths, as a gauge shows it. The other limits only keep a slip of the finger out.
export const READING_LIMITS = { odometerKm: 2_000_000, fuelEighths: 8, includedKmPerDay: 5_000 } as const

export type Reading = { readonly odometerKm: number; readonly fuelEighths: number }
export type ReadingProblem = 'odometer_invalid' | 'fuel_invalid'
export type ReturnReadingProblem = ReadingProblem | 'odometer_below_handover'

const whole = (value: number, most: number) => Number.isInteger(value) && value >= 0 && value <= most

export function checkReading(reading: Reading): readonly ReadingProblem[] {
  return [...(whole(reading.odometerKm, READING_LIMITS.odometerKm) ? [] : ['odometer_invalid' as const]), ...(whole(reading.fuelEighths, READING_LIMITS.fuelEighths) ? [] : ['fuel_invalid' as const])]
}

// A return's reading is a reading, and its odometer never reads less than the handover's.
export function checkReturnReading(handover: Reading, returned: Reading): readonly ReturnReadingProblem[] {
  const problems = checkReading(returned)
  if (problems.length > 0) return problems
  return returned.odometerKm < handover.odometerKm ? ['odometer_below_handover'] : []
}

// The kilometres a type of vehicle includes for each day of a rental. None at all charges every kilometre.
export function checkIncludedDistance(kmPerDay: number): boolean {
  return whole(kmPerDay, READING_LIMITS.includedKmPerDay)
}

export type ReadingUsage = {
  readonly drivenKm: number
  readonly includedKm: number
  // Beyond what the rental's days include: what the price list's mileage entry is charged for, a kilometre each.
  readonly excessKm: number
  // Less fuel than at handover: what the fuel entry is charged for, an eighth of a tank each. More fuel is not paid back.
  readonly missingFuelEighths: number
}

// What a rental used, from its two readings and the days it was booked for. Nothing here is negative: a return with a
// lower odometer is refused before it gets here, and counts as no distance if it ever does.
export function readingUsage({ handover, returned, days, includedKmPerDay }: { readonly handover: Reading; readonly returned: Reading; readonly days: number; readonly includedKmPerDay: number }): ReadingUsage {
  const drivenKm = Math.max(0, returned.odometerKm - handover.odometerKm)
  const includedKm = Math.max(0, days) * includedKmPerDay
  return { drivenKm, includedKm, excessKm: Math.max(0, drivenKm - includedKm), missingFuelEighths: Math.max(0, handover.fuelEighths - returned.fuelEighths) }
}

// How a charge from the readings was counted, written on its claim line: figures and signs alone, so it reads the same
// in every language beside the shop's own words for the price. Kept with the line, where the renter, an advocate and
// the evidence pack all read it.
export function readingReason(reading: UnitPriceCategory, { handover, returned, usage, unit }: { readonly handover: Reading; readonly returned: Reading; readonly usage: ReadingUsage; readonly unit: Money }): string {
  const each = `${amountText(unit)} ${unit.currency}`
  if (reading === 'fuel') return `${String(handover.fuelEighths)}/${String(READING_LIMITS.fuelEighths)} → ${String(returned.fuelEighths)}/${String(READING_LIMITS.fuelEighths)} · ${String(usage.missingFuelEighths)} × ${each}`
  return `${String(handover.odometerKm)} km → ${String(returned.odometerKm)} km · ${String(usage.drivenKm)} km − ${String(usage.includedKm)} km = ${String(usage.excessKm)} km × ${each}`
}
