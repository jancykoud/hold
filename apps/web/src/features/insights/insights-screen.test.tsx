import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithIntl } from '@/test/render'
import { InsightsScreen } from './insights-screen'
import type { InsightsTables } from './insights-tables'

// The insights dashboard (extensions.md section 12.5), drawn by Hold with no library: every figure is written in
// words beside its bar, so nothing is read from a bar's length or colour alone.

const at = (day: string) => new Date(`${day}T10:00:00Z`)
const tables: InsightsTables = {
  money: [
    { line_id: '1', rental_id: 'r1', occurred_at: at('2026-10-03'), month: '2026-10', kind: 'Taken from the hold', flow: 'To the shop', amount_cents: 35_00, to_shop_cents: 35_00, back_cents: null },
    { line_id: '2', rental_id: 'r1', occurred_at: at('2026-10-03'), month: '2026-10', kind: 'Hold released', flow: 'Back to the renter', amount_cents: 215_00, to_shop_cents: null, back_cents: 215_00 },
  ],
  rentals: [
    { rental_id: 'r1', starts_at: at('2026-10-01'), where: 'Taken', held_now_cents: 0, to_shop_cents: 35_00, back_cents: 215_00, reserved_cents: 250_00, captured_cents: 35_00, released_cents: 215_00, check: 'Agrees', sample: true },
    { rental_id: 'r2', starts_at: at('2026-10-10'), where: 'Held', held_now_cents: 300_00, to_shop_cents: 0, back_cents: 0, reserved_cents: 300_00, captured_cents: 0, released_cents: 0, check: 'Agrees', sample: false },
  ],
  holds: [{ rental_id: 'r1', trust_rung: 'Rung 2', reserved_cents: 250_00, ordinary_cents: 300_00, lowered_cents: 50_00, sample: true }],
  lives: [{ rental_id: 'r2', reserved_cents: 300_00, day: 14, days: 29, assured_days: 3, standing: 'Valid', valid_until: at('2026-10-30'), sample: false }],
  items: [{ item_id: 'i1', item_type: 'Hybrid bike', item: 'Hybrid bike 1', rentals: 1, days_out: 3, damage_found: 1, priced_cents: 35_00, recovered_cents: 35_00, open_marks: 1, wearing_fastest: 'Yes', sample: false }],
}
const none: InsightsTables = { money: [], rentals: [], holds: [], lives: [], items: [] }
const clock = { timeZone: 'Europe/Lisbon', currency: 'EUR' }
const show = (given: InsightsTables, canDecide = true) => renderWithIntl(<InsightsScreen shopName="Ribeira Bikes" clock={clock} tables={given} canDecide={canDecide} />)
const panel = (name: string) => screen.getByRole('region', { name })

describe('the insights dashboard', () => {
  it('opens on where the money is: held now, to the shop and back to renters', () => {
    show(tables)
    expect(screen.getByText('Held on renters’ accounts now').closest('div')).toHaveTextContent('€300.00')
    expect(screen.getAllByText('To the shop')[0]?.closest('div')).toHaveTextContent('€35.00')
    expect(screen.getAllByText('Back to renters')[0]?.closest('div')).toHaveTextContent('€215.00')
  })

  it('says each month’s money, each type’s damage and each rung’s holds in words beside their bars', () => {
    show(tables)
    const month = within(panel('Money by month')).getByRole('listitem')
    expect(month).toHaveTextContent('October 2026')
    expect(month).toHaveTextContent('To the shop €35.00')
    expect(month).toHaveTextContent('Back to renters €215.00')
    expect(within(panel('Damage priced and recovered, by item type')).getByRole('listitem')).toHaveTextContent('Hybrid bikeDamage priced €35.00Recovered €35.00')
    expect(within(panel('Holds by trust rung')).getByRole('listitem')).toHaveTextContent('Rung 2Hold given €250.00Ordinary hold €300.00')
  })

  it('draws each hold PayPal holds now on its 29 days, and the settlement stepping down to what is still held', () => {
    show(tables)
    expect(within(panel('Each hold on its 29 days')).getByText('Day 14 of 29 · Valid · €300.00 held')).toBeInTheDocument()
    const waterfall = panel('Reserved, captured, released')
    expect(within(waterfall).getAllByRole('listitem').map((step) => step.textContent)).toEqual(['Reserved€550.00', 'Captured€35.00', 'Released to renters€215.00', 'Still held€300.00'])
    expect(within(waterfall).getByText('Captured and released stay within what was reserved.')).toBeInTheDocument()
  })

  it('lists every item with what its rentals say, in a table', () => {
    show(tables)
    const table = within(panel('Every item')).getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Item', 'Item type', 'Rentals', 'Days out', 'Damage found', 'Damage priced', 'Recovered', 'Open marks', 'Wearing fastest'])
    expect(within(table).getByRole('row', { name: /Hybrid bike 1/ })).toHaveTextContent('Hybrid bike 1Hybrid bike131€35.00€35.001Yes')
  })

  it('says so when a shop has no figures yet', () => {
    show(none)
    expect(screen.getByText('No figures yet')).toBeInTheDocument()
  })

  it('tells anyone but an owner or a manager who opens it, and points to the money page', () => {
    show(none, false)
    expect(screen.getByText('Only the owner or a manager opens the insights dashboard.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the Money page' })).toHaveAttribute('href', '/shop/money')
  })
})
