import { add, smaller, subtract, times, zero } from './money.ts'
import type { Money } from './money.ts'
import { fail, ok } from './result.ts'
import type { UnitPriceCategory } from './price-list.ts'
import type { Result } from './result.ts'

// Where a claim line came from. A line without photographs needs a named person and their written reason. A line the
// renter agreed during the rental rests on the photographs they took of it (extensions.md section 10.4). A line charged
// from a vehicle's readings rests on the two photographs of its dashboard, at handover and at return (readings.ts).
export type ClaimLineSource =
  | { readonly kind: 'finding'; readonly findingId: string; readonly photoCount: number }
  | { readonly kind: 'person'; readonly staffId: string; readonly reason: string }
  | { readonly kind: 'agreed_in_rental'; readonly incidentId: string; readonly photoCount: number }
  | { readonly kind: 'reading'; readonly reading: UnitPriceCategory; readonly quantity: number; readonly photoCount: number }

// The amount is always read from the agreed price list entry, never supplied by a model or a client.
export type ClaimLine = {
  readonly priceEntryId: string
  readonly amount: Money
  readonly source: ClaimLineSource
}

export type ClaimLineProblem = {
  readonly kind: 'line_without_evidence'
  readonly lineIndex: number
}

export function claimTotal(lines: readonly ClaimLine[], currency: string): Money {
  return lines.reduce((total, line) => add(total, line.amount), zero(currency))
}

export function checkClaimLines(lines: readonly ClaimLine[]): Result<void, ClaimLineProblem> {
  const lineIndex = lines.findIndex((line) => !hasEvidence(line.source))
  return lineIndex === -1 ? ok(undefined) : fail({ kind: 'line_without_evidence', lineIndex })
}

function hasEvidence(source: ClaimLineSource): boolean {
  if (source.kind === 'person') return source.staffId !== '' && source.reason.trim() !== ''
  // A reading is two figures, so it rests on both dashboard photographs.
  return source.kind === 'reading' ? source.photoCount >= 2 : source.photoCount > 0
}

// A line charged from the readings: the agreed list's price of one, as many times as plain code counted (readingUsage).
// The amount is worked out here and nowhere else, so no person and no model ever types it.
export function readingLine({ priceEntryId, unit, reading, quantity, photoCount }: { readonly priceEntryId: string; readonly unit: Money; readonly reading: UnitPriceCategory; readonly quantity: number; readonly photoCount: number }): Result<ClaimLine, 'nothing_to_charge'> {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return fail('nothing_to_charge')
  return ok({ priceEntryId, amount: times(unit, quantity), source: { kind: 'reading', reading, quantity, photoCount } })
}

// How an approved claim meets the hold. Hold never takes more than the reserved amount, even where PayPal would allow it.
export type Settlement = {
  // Taken from the hold.
  readonly capture: Money
  // Returned to the renter in the same step.
  readonly release: Money
  // Above the hold, sent as a separate invoice with the same evidence.
  readonly invoice: Money
}

export function settle(claim: Money, reserved: Money): Settlement {
  const capture = smaller(claim, reserved)
  return { capture, release: subtract(reserved, capture), invoice: subtract(claim, capture) }
}
