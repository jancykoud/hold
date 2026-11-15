import { suggestedPhotoPlan } from '@hold/domain'
import { describe, expect, it } from 'vitest'
import { exampleRental, outcomeKeys } from './example-rental'

describe('exampleRental', () => {
  it.each(outcomeKeys)('accounts for the whole hold when the outcome is %s', (key) => {
    const outcome = exampleRental.outcomes[key]
    expect(outcome.takenCents + outcome.releasedCents).toBe(exampleRental.reservedCents)
  })

  it('takes nothing on a clean return', () => {
    expect(exampleRental.outcomes.clean.takenCents).toBe(0)
  })

  it('never takes more than was reserved', () => {
    expect(exampleRental.outcomes.damage.takenCents).toBeLessThanOrEqual(exampleRental.reservedCents)
  })

  it('takes the published price of a scratch, and nothing else, when the car comes back scratched', () => {
    expect(exampleRental.outcomes.damage.takenCents).toBe(exampleRental.priceListCents.scratch)
  })

  it('photographs every view of the plan Hold suggests for a car', () => {
    expect(exampleRental.photographCount).toBe(suggestedPhotoPlan('car').length)
  })

  it('holds every amount as whole cents', () => {
    const amounts = [
      exampleRental.reservedCents,
      ...outcomeKeys.flatMap((key) => Object.values(exampleRental.outcomes[key])),
    ]
    expect(amounts.every(Number.isInteger)).toBe(true)
  })
})
