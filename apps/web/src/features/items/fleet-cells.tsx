'use client'

import type { CustomCellRendererProps } from 'ag-grid-react'
import { Gauge } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createContext, useContext } from 'react'
import { SampleTag } from '@/components/ui/sample-tag'
import { Link } from '@/i18n/navigation'
import { itemRoutes } from '@/lib/routes'
import type { FleetRow } from './fleet-rows'
import { StandingBadge } from './standing-badge'

// What every cell needs beyond its row. ag-grid-react draws each cell inside the grid's own React tree.
export type FleetGridState = { readonly money: (cents: number) => string }
export const FleetGridContext = createContext<FleetGridState | null>(null)

export function useFleetGrid(): FleetGridState {
  const state = useContext(FleetGridContext)
  if (state === null) throw new Error('A fleet cell is drawn outside its grid.')
  return state
}

type CellProps = CustomCellRendererProps<FleetRow>

// The item the comparison finds the most damage on, rental for rental, in its type: in words and a sign.
function FastestBadge() {
  const t = useTranslations('shop.items.fleet')
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
      <Gauge aria-hidden="true" className="size-3.5 shrink-0" />
      {t('fastest')}
    </span>
  )
}

// A type: its name and kind; its terms and a way to change it are in its panel below the grid. An item: its name as a
// link to its passport, with its size.
export function FleetNameCell({ data }: CellProps) {
  const t = useTranslations('shop.items')
  if (data === undefined) return null
  if (data.kind === 'item') {
    return (
      // Where the name and the signal do not fit side by side, the signal goes under the name.
      <span className="flex h-full min-w-0 flex-wrap content-center items-center gap-x-2 leading-tight">
        <span className="flex min-w-0 max-w-full items-center gap-2">
          <Link href={itemRoutes.item(data.item.id)} className="min-h-11 min-w-11 content-center truncate font-semibold underline-offset-4 hover:underline">{data.item.label}</Link>
          {data.item.size === null ? null : <span className="shrink-0 text-sm text-muted-foreground">{data.item.size}</span>}
        </span>
        {data.fastest ? <FastestBadge /> : null}
      </span>
    )
  }
  return (
    <span className="flex h-full min-w-0 items-center gap-x-3">
      <span className="min-w-0 truncate font-bold">{data.type.name}</span>
      {/* The kind gives way first: shown from xl, and shrinking before the name. */}
      <span className="hidden min-w-0 shrink-[3] truncate text-sm text-muted-foreground xl:inline">{t(`categories.${data.type.category}`)}</span>
      {data.type.simulated ? <SampleTag /> : null}
    </span>
  )
}

// Where an item is; for a type, how many of its items are shown.
export function FleetStandingCell({ data }: CellProps) {
  const t = useTranslations('shop.items.fleet')
  if (data === undefined) return null
  if (data.kind === 'item') return <span className="flex h-full items-center"><StandingBadge standing={data.item.standing} /></span>
  return <span className="flex h-full items-center text-sm text-muted-foreground">{t('items', { count: data.totals.items })}</span>
}

// What was recovered of the damage priced: an item's own, or a type's items added up.
export function FleetRecoveredCell({ data }: CellProps) {
  const t = useTranslations('shop.items.fleet')
  const { money } = useFleetGrid()
  if (data === undefined) return null
  const priced = data.kind === 'item' ? data.wear.incurredCents : (data.totals.incurredCents ?? 0)
  const recovered = data.kind === 'item' ? data.wear.recoveredCents : (data.totals.recoveredCents ?? 0)
  return <span className="figures flex h-full items-center justify-end">{priced === 0 ? '—' : t('recoveredOf', { recovered: money(recovered), priced: money(priced) })}</span>
}

// The damage found on an item, rental by rental, as a line of bars: the tallest is the rental with the most. A
// picture of figures the spreadsheet holds in full, so it is not read aloud.
export function FleetFindingsCell({ data }: CellProps) {
  if (data?.kind !== 'item' || data.wear.findingsByRental.length === 0) return null
  const most = Math.max(1, ...data.wear.findingsByRental)
  return (
    <span aria-hidden="true" className="flex h-full items-end gap-0.5 py-2.5">
      {data.wear.findingsByRental.map((findings, rental) => (
        // The rentals are in the order they happened and never move, so their place names them.
        <span key={rental} className="min-h-px min-w-1 flex-1 rounded-sm bg-primary" style={{ height: `${String(Math.round((findings / most) * 100))}%` }} />
      ))}
    </span>
  )
}

export function FleetCountCell({ value }: CustomCellRendererProps<FleetRow, number | null>) {
  return typeof value === 'number' ? <span className="figures flex h-full items-center justify-end">{value}</span> : null
}
