import type { InsightsTables } from './insights-tables'
import { lifeSegments, waterfallSteps } from './widget-shapes'

// The insights dashboard's figures (extensions.md section 12.5): what each of its panels draws, added up from the
// tables by plain code, in cents. Nothing here goes back to any record.

// The holds a line is drawn for, the nearest their end first.
const MOST_LIVES = 12

const sum = <Row>(rows: readonly Row[], of: (row: Row) => number | null) => rows.reduce((total, row) => total + (of(row) ?? 0), 0)

// Rows added up under each key, the keys in the order they first come.
function grouped<Row, Key extends string>(rows: readonly Row[], keyOf: (row: Row) => Key): [Key, Row[]][] {
  const groups = new Map<Key, Row[]>()
  for (const row of rows) groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row])
  return [...groups]
}

export function insightsFigures(tables: InsightsTables) {
  const lives = [...tables.lives].sort((first, second) => second.day - first.day)
  return {
    totals: {
      heldNowCents: sum(tables.rentals, (rental) => rental.held_now_cents),
      toShopCents: sum(tables.money, (line) => line.to_shop_cents),
      backCents: sum(tables.money, (line) => line.back_cents),
    },
    // Only the months in which money went to the shop or back to a renter.
    byMonth: grouped(tables.money.filter((line) => line.to_shop_cents !== null || line.back_cents !== null), (line) => line.month)
      .map(([month, lines]) => ({ month, toShopCents: sum(lines, (line) => line.to_shop_cents), backCents: sum(lines, (line) => line.back_cents) }))
      .sort((first, second) => first.month.localeCompare(second.month)),
    byType: grouped(tables.items, (item) => item.item_type)
      .map(([type, items]) => ({ type, pricedCents: sum(items, (item) => item.priced_cents), recoveredCents: sum(items, (item) => item.recovered_cents) }))
      .sort((first, second) => second.pricedCents - first.pricedCents),
    byRung: grouped(tables.holds, (hold) => hold.trust_rung).map(([rung, holds]) => ({ rung, reservedCents: sum(holds, (hold) => hold.reserved_cents), ordinaryCents: sum(holds, (hold) => hold.ordinary_cents), holds: holds.length })),
    lives: lives.slice(0, MOST_LIVES).map((life) => ({ rentalId: life.rental_id, day: Math.min(life.day, life.days), days: life.days, standing: life.standing, reservedCents: life.reserved_cents, shape: lifeSegments({ day: life.day, days: life.days, assuredDays: life.assured_days }) })),
    livesLeftOut: Math.max(0, lives.length - MOST_LIVES),
    waterfall: waterfallSteps({ reservedCents: sum(tables.rentals, (rental) => rental.reserved_cents), capturedCents: sum(tables.rentals, (rental) => rental.captured_cents), releasedCents: sum(tables.rentals, (rental) => rental.released_cents) }),
  }
}

export type InsightsFigures = ReturnType<typeof insightsFigures>
