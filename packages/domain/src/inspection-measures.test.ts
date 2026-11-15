import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { contestsOf, retakesOf } from './inspection-measures.ts'
import type { MeasuredClaim, MeasuredSession } from './inspection-measures.ts'

// What an inspection costs to take and to settle, beside how long it takes (counter-routine.ts): how often a
// photograph is taken again, and how many claims a renter contests and how long the shop takes to decide them. Each
// is a count over a count, so a better way of capturing or of showing evidence can be told from a worse one.

const session = (retakes: number, overrides: Partial<MeasuredSession> = {}): MeasuredSession => ({ kind: 'handover', sealed: true, simulated: false, retakes, ...overrides })
const at = (minute: number) => new Date(Date.UTC(2026, 10, 15, 9, minute))
const claim = (overrides: Partial<MeasuredClaim> = {}): MeasuredClaim => ({ simulated: false, presentedAt: at(0), contestedAt: null, decidedAt: null, ...overrides })

describe('how often a photograph is taken again', () => {
  it('counts the retakes over the handovers and returns sealed, and how many of them needed one', () => {
    expect(retakesOf([session(0), session(2), session(1, { kind: 'return' }), session(0, { kind: 'return' })])).toEqual({ inspections: 4, retakes: 3, withRetake: 2 })
  })

  it('leaves out a session not sealed yet, one of the demonstration’s, and any other kind', () => {
    expect(retakesOf([session(1), session(4, { sealed: false }), session(4, { simulated: true }), session(4, { kind: 'incident' })])).toEqual({ inspections: 1, retakes: 1, withRetake: 1 })
  })

  it('says nothing was measured when no inspection was, rather than none was retaken', () => {
    expect(retakesOf([])).toEqual({ inspections: 0, retakes: 0, withRetake: 0 })
  })

  it('never counts more inspections with a retake than inspections, nor than retakes', () => {
    fc.assert(fc.property(fc.array(fc.nat({ max: 9 }), { maxLength: 30 }), (counts) => {
      const measure = retakesOf(counts.map((count) => session(count)))
      expect(measure.withRetake).toBeLessThanOrEqual(measure.inspections)
      expect(measure.withRetake).toBeLessThanOrEqual(measure.retakes)
    }))
  })
})

describe('how many claims are contested, and how long the shop takes to decide them', () => {
  it('counts the claims shown to a renter and those the renter contested', () => {
    expect(contestsOf([claim(), claim({ contestedAt: at(30) }), claim({ contestedAt: at(40), decidedAt: at(100) })])).toMatchObject({ presented: 3, contested: 2 })
  })

  it('gives the median time from a contest to the shop’s decision, over the contests decided', () => {
    const measure = contestsOf([claim({ contestedAt: at(0), decidedAt: at(10) }), claim({ contestedAt: at(0), decidedAt: at(30) }), claim({ contestedAt: at(0), decidedAt: at(50) }), claim({ contestedAt: at(5) })])
    expect(measure.decision).toEqual({ medianSeconds: 30 * 60, count: 3 })
  })

  it('leaves out a claim never shown to a renter and the demonstration’s, and gives no time when no contest was decided', () => {
    expect(contestsOf([claim({ presentedAt: null }), claim({ simulated: true, contestedAt: at(1), decidedAt: at(2) }), claim()])).toEqual({ presented: 1, contested: 0, decision: { medianSeconds: null, count: 0 } })
  })
})
