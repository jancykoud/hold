import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { ITEM_CATEGORIES } from './photo-plan.ts'
import { checkIncludedDistance, checkReading, checkReturnReading, READING_LIMITS, readingUsage, takesReadings } from './readings.ts'

// What a vehicle's dashboard says at handover and at return (vehicle-plan.md step 3): the kilometres on its odometer and
// the fuel in its tank, in eighths. Staff enter both from the dashboard photograph; plain code works out the rest.

describe('the kinds of item whose dashboard is read', () => {
  it('are the vehicles that are driven, and no other kind', () => {
    expect(ITEM_CATEGORIES.filter(takesReadings)).toEqual(['car', 'van', 'motorhome', 'motorbike'])
  })
})

describe('a reading', () => {
  it('is whole kilometres and a tank in eighths, from empty to full', () => {
    expect(checkReading({ odometerKm: 48_210, fuelEighths: 8 })).toEqual([])
    expect(checkReading({ odometerKm: 0, fuelEighths: 0 })).toEqual([])
  })

  it('names what is wrong with each figure', () => {
    expect(checkReading({ odometerKm: -1, fuelEighths: 9 })).toEqual(['odometer_invalid', 'fuel_invalid'])
    expect(checkReading({ odometerKm: 12.5, fuelEighths: 3.5 })).toEqual(['odometer_invalid', 'fuel_invalid'])
    expect(checkReading({ odometerKm: READING_LIMITS.odometerKm + 1, fuelEighths: Number.NaN })).toEqual(['odometer_invalid', 'fuel_invalid'])
  })

  it('at return is refused when the odometer reads less than at handover, which no vehicle does', () => {
    const handover = { odometerKm: 48_210, fuelEighths: 8 }
    expect(checkReturnReading(handover, { odometerKm: 48_209, fuelEighths: 8 })).toEqual(['odometer_below_handover'])
    expect(checkReturnReading(handover, { odometerKm: 48_210, fuelEighths: 2 })).toEqual([])
    expect(checkReturnReading(handover, { odometerKm: -5, fuelEighths: 2 })).toEqual(['odometer_invalid'])
  })
})

describe('the distance a type of vehicle includes each day', () => {
  it('is whole kilometres, none at all or up to the limit', () => {
    expect(checkIncludedDistance(200)).toBe(true)
    expect(checkIncludedDistance(0)).toBe(true)
    expect(checkIncludedDistance(-1)).toBe(false)
    expect(checkIncludedDistance(150.5)).toBe(false)
    expect(checkIncludedDistance(READING_LIMITS.includedKmPerDay + 1)).toBe(false)
  })
})

describe('what a rental used, from its two readings', () => {
  const handover = { odometerKm: 48_210, fuelEighths: 8 }

  it('charges the kilometres beyond those its days include, and the eighths of a tank that are missing', () => {
    expect(readingUsage({ handover, returned: { odometerKm: 48_930, fuelEighths: 5 }, days: 3, includedKmPerDay: 200 })).toEqual({ drivenKm: 720, includedKm: 600, excessKm: 120, missingFuelEighths: 3 })
  })

  it('charges nothing for a vehicle driven within its days and brought back as full, or fuller', () => {
    expect(readingUsage({ handover: { odometerKm: 100, fuelEighths: 4 }, returned: { odometerKm: 500, fuelEighths: 6 }, days: 2, includedKmPerDay: 200 })).toEqual({ drivenKm: 400, includedKm: 400, excessKm: 0, missingFuelEighths: 0 })
  })

  it('charges every kilometre of a type that includes none', () => {
    expect(readingUsage({ handover, returned: { odometerKm: 48_260, fuelEighths: 8 }, days: 4, includedKmPerDay: 0 })).toMatchObject({ includedKm: 0, excessKm: 50 })
  })

  it('never charges a negative distance or a negative tank, whatever the readings', () => {
    const reading = fc.record({ odometerKm: fc.integer({ min: 0, max: READING_LIMITS.odometerKm }), fuelEighths: fc.integer({ min: 0, max: 8 }) })
    fc.assert(fc.property(reading, reading, fc.integer({ min: 1, max: 60 }), fc.integer({ min: 0, max: READING_LIMITS.includedKmPerDay }), (first, second, days, includedKmPerDay) => {
      const usage = readingUsage({ handover: first, returned: second, days, includedKmPerDay })
      expect(usage.excessKm).toBeGreaterThanOrEqual(0)
      expect(usage.missingFuelEighths).toBeGreaterThanOrEqual(0)
      expect(usage.missingFuelEighths).toBeLessThanOrEqual(8)
      expect(usage.excessKm).toBeLessThanOrEqual(usage.drivenKm)
    }))
  })
})
