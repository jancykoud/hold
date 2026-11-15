import type { CaptureSessionKind } from './capture-session.ts'
import { median } from './counter-routine.ts'
import type { RoutineTime } from './counter-routine.ts'

// What an inspection costs to take and to settle, beside how long it takes (counter-routine.ts): how often a
// photograph is taken again, and how many claims a renter contests and how long the shop takes to decide them. Each is
// a count over a count, never a bare rate, so one way of capturing or of showing evidence can be told from another on
// the same footing. The demonstration's sessions and claims are left out, as counterRoutine leaves them out.

// retakes: the photographs of the session that a later one of the same view replaced.
export type MeasuredSession = { readonly kind: CaptureSessionKind; readonly sealed: boolean; readonly simulated: boolean; readonly retakes: number }
export type RetakeMeasure = { readonly inspections: number; readonly retakes: number; readonly withRetake: number }

// Over the handovers and returns sealed: how many photographs were taken again, and how many inspections needed one.
export function retakesOf(sessions: readonly MeasuredSession[]): RetakeMeasure {
  const counted = sessions.filter((session) => (session.kind === 'handover' || session.kind === 'return') && session.sealed && !session.simulated)
  return { inspections: counted.length, retakes: counted.reduce((sum, session) => sum + session.retakes, 0), withRetake: counted.filter((session) => session.retakes > 0).length }
}

export type MeasuredClaim = { readonly simulated: boolean; readonly presentedAt: Date | null; readonly contestedAt: Date | null; readonly decidedAt: Date | null }
export type ContestMeasure = { readonly presented: number; readonly contested: number; readonly decision: RoutineTime }

// Over the claims shown to a renter: how many the renter contested, and for those the shop then decided, the median
// time from the contest to the decision. That is time elapsed, not time a person spent on it.
export function contestsOf(claims: readonly MeasuredClaim[]): ContestMeasure {
  const presented = claims.filter((claim) => claim.presentedAt !== null && !claim.simulated)
  const contested = presented.filter((claim) => claim.contestedAt !== null)
  const seconds = contested.flatMap((claim) => (claim.contestedAt === null || claim.decidedAt === null ? [] : [Math.max(0, (claim.decidedAt.getTime() - claim.contestedAt.getTime()) / 1000)]))
  return { presented: presented.length, contested: contested.length, decision: { medianSeconds: median(seconds), count: seconds.length } }
}
