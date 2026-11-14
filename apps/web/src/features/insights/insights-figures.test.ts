import { describe, expect, it } from 'vitest'
import { insightsFigures } from './insights-figures'
import type { InsightsTables } from './insights-tables'

// The insights dashboard's figures (extensions.md section 12.5): what its panels draw, added up from the tables by
// plain code, in cents.

const at = (day: string) => new Date(`${day}T10:00:00Z`)
const money = (month: string, toShop: number | null, back: number | null): InsightsTables['money'][number] => ({ line_id: `${month}-${String(toShop)}-${String(back)}`, rental_id: 'r1', occurred_at: at(`${month}-03`), month, kind: 'kind', flow: 'flow', amount_cents: toShop ?? back ?? 0, to_shop_cents: toShop, back_cents: back })
const rental = (held: number, reserved: number, captured: number, released: number): InsightsTables['rentals'][number] => ({ rental_id: 'r', starts_at: at('2026-10-01'), where: 'where', held_now_cents: held, to_shop_cents: 0, back_cents: 0, reserved_cents: reserved, captured_cents: captured, released_cents: released, check: 'Agrees', sample: false })
const hold = (rung: string, reserved: number, ordinary: number): InsightsTables['holds'][number] => ({ rental_id: 'r', trust_rung: rung, reserved_cents: reserved, ordinary_cents: ordinary, lowered_cents: ordinary - reserved, sample: false })
const life = (rentalId: string, day: number): InsightsTables['lives'][number] => ({ rental_id: rentalId, reserved_cents: 300_00, day, days: 29, assured_days: 3, standing: 'Valid', valid_until: at('2026-10-30'), sample: false })
const item = (type: string, priced: number, recovered: number): InsightsTables['items'][number] => ({ item_id: `${type}-${String(priced)}`, item_type: type, item: `${type} 1`, rentals: 1, days_out: 2, damage_found: 1, priced_cents: priced, recovered_cents: recovered, open_marks: 0, wearing_fastest: 'No', sample: false })

const tables: InsightsTables = {
  money: [money('2026-10', 35_00, null), money('2026-09', 120_00, null), money('2026-10', null, 215_00), money('2026-10', 45_00, null), money('2026-10', null, null)],
  rentals: [rental(300_00, 300_00, 0, 0), rental(0, 250_00, 35_00, 215_00)],
  holds: [hold('Rung 2', 250_00, 300_00), hold('No rung', 300_00, 300_00), hold('Rung 2', 200_00, 300_00)],
  lives: [life('a', 3), life('b', 27), life('c', 14)],
  items: [item('Hybrid bike', 35_00, 35_00), item('Kayak', 45_00, 0), item('Hybrid bike', 20_00, 10_00)],
}

describe('the insights dashboard’s figures', () => {
  const figures = insightsFigures(tables)

  it('adds up what is held now, what went to the shop and what went back to renters', () => {
    expect(figures.totals).toEqual({ heldNowCents: 300_00, toShopCents: 200_00, backCents: 215_00 })
  })

  it('adds up each month’s money, the months in the order they came', () => {
    expect(figures.byMonth).toEqual([
      { month: '2026-09', toShopCents: 120_00, backCents: 0 },
      { month: '2026-10', toShopCents: 80_00, backCents: 215_00 },
    ])
  })

  it('adds up the damage priced and recovered for each type of item, the costliest first', () => {
    expect(figures.byType).toEqual([
      { type: 'Hybrid bike', pricedCents: 55_00, recoveredCents: 45_00 },
      { type: 'Kayak', pricedCents: 45_00, recoveredCents: 0 },
    ])
  })

  it('adds up the holds given and the ordinary holds for each rung of the trust ladder', () => {
    expect(figures.byRung).toEqual([
      { rung: 'Rung 2', reservedCents: 450_00, ordinaryCents: 600_00, holds: 2 },
      { rung: 'No rung', reservedCents: 300_00, ordinaryCents: 300_00, holds: 1 },
    ])
  })

  it('puts the holds PayPal holds now in the order they end, the nearest first, each with the shape of its 29 days', () => {
    expect(figures.lives.map((each) => each.rentalId)).toEqual(['b', 'c', 'a'])
    expect(figures.lives[0]).toMatchObject({ day: 27, days: 29, standing: 'Valid', reservedCents: 300_00 })
    expect(figures.lives[0]?.shape.segments.map((segment) => segment.kind)).toEqual(['assured', 'valid', 'ending'])
  })

  it('draws no more than twelve of them, and says how many it left out', () => {
    const many = insightsFigures({ ...tables, lives: Array.from({ length: 15 }, (_, index) => life(`h${String(index)}`, index + 1)) })
    expect(many.lives).toHaveLength(12)
    expect(many.livesLeftOut).toBe(3)
    expect(figures.livesLeftOut).toBe(0)
  })

  it('steps from what was reserved down by what was captured and released to what is still held', () => {
    expect(figures.waterfall.steps.map((step) => [step.kind, step.cents])).toEqual([['reserved', 550_00], ['captured', 35_00], ['released', 215_00], ['held', 300_00]])
    expect(figures.waterfall.withinHold).toBe(true)
  })
})
