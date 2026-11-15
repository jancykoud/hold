import { parseAmount } from './currency.ts'
import { descriptionProblem, priceCode, UNIT_PRICE_CATEGORIES } from './price-list.ts'
import type { DamageType, DescriptionProblem, PriceCategory } from './price-list.ts'

// The price list as a shop edits it before publishing it (extensions.md section 12.5). The rules are publishing's own,
// applied cell by cell, so the editor can say exactly which cell is wrong before anything is sent.

export type PriceCellProblems = { readonly description?: DescriptionProblem; readonly amount?: 'amount_invalid' | 'amount_zero'; readonly category?: 'category_repeated' }

export function checkPriceRows(rows: readonly { readonly description: string; readonly amount: string; readonly category?: PriceCategory }[], currency: string): PriceCellProblems[] {
  const seen = new Set<string>()
  const priced = new Set<PriceCategory>()
  return rows.map((row) => {
    // A kilometre and an eighth of a tank have one price each (checkPriceList).
    const repeated = row.category !== undefined && UNIT_PRICE_CATEGORIES.some((category) => category === row.category) && priced.has(row.category)
    if (row.category !== undefined) priced.add(row.category)
    const description = descriptionProblem(row.description, seen)
    const parsed = parseAmount(row.amount, currency)
    const amount = parsed === undefined ? 'amount_invalid' : parsed.cents === 0 ? 'amount_zero' : undefined
    return { ...(description === undefined ? {} : { description }), ...(amount === undefined ? {} : { amount }), ...(repeated ? { category: 'category_repeated' as const } : {}) }
  })
}

// The code each entry is published under: from its description, and numbered when two descriptions make one code.
export function draftCodes(descriptions: readonly string[]): string[] {
  const codes = new Set<string>()
  return descriptions.map((description, index) => {
    let code = priceCode(description, index)
    if (codes.has(code)) code = `${code}-${String(index + 1)}`
    codes.add(code)
    return code
  })
}

// damageType: the type of damage a price for damage names, when it names one.
type VersionEntry = { readonly description: string; readonly category: PriceCategory; readonly amountCents: number; readonly damageType?: DamageType | undefined }
type CodedEntry = VersionEntry & { readonly code: string }
export type PriceListDiff = {
  readonly added: readonly CodedEntry[]
  readonly removed: readonly CodedEntry[]
  readonly changed: readonly { readonly code: string; readonly description: string; readonly from: Omit<VersionEntry, 'description'>; readonly to: Omit<VersionEntry, 'description'> }[]
  readonly unchanged: number
  readonly wearPolicyChanged: boolean
}

// The type of damage only where there is one, so a price without one reads as it always did.
const typed = (entry: Pick<VersionEntry, 'damageType'>) => (entry.damageType === undefined ? {} : { damageType: entry.damageType })

const coded = (entries: readonly VersionEntry[]): CodedEntry[] => {
  const codes = draftCodes(entries.map((entry) => entry.description))
  return entries.map((entry, index) => ({ code: codes[index] ?? '', description: entry.description, category: entry.category, amountCents: entry.amountCents, ...typed(entry) }))
}

// What changed between two versions of a shop's terms, entry by entry, matched by code. A renter agreed to one version
// at booking; this is how a shop sees what a renter on the older one did not agree to.
export function diffPriceLists(before: { readonly entries: readonly VersionEntry[]; readonly wearPolicy: string }, after: { readonly entries: readonly VersionEntry[]; readonly wearPolicy: string }): PriceListDiff {
  const older = coded(before.entries)
  const newer = coded(after.entries)
  const byCode = new Map(older.map((entry) => [entry.code, entry]))
  const changed: PriceListDiff['changed'][number][] = []
  let unchanged = 0
  for (const entry of newer) {
    const earlier = byCode.get(entry.code)
    if (earlier === undefined) continue
    if (earlier.amountCents === entry.amountCents && earlier.category === entry.category && earlier.damageType === entry.damageType) unchanged += 1
    else changed.push({ code: entry.code, description: entry.description, from: { category: earlier.category, amountCents: earlier.amountCents, ...typed(earlier) }, to: { category: entry.category, amountCents: entry.amountCents, ...typed(entry) } })
  }
  const newerCodes = new Set(newer.map((entry) => entry.code))
  return {
    added: newer.filter((entry) => !byCode.has(entry.code)),
    removed: older.filter((entry) => !newerCodes.has(entry.code)),
    changed,
    unchanged,
    wearPolicyChanged: before.wearPolicy.trim() !== after.wearPolicy.trim(),
  }
}
