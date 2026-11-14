'use client'

import type { CustomCellRendererProps } from 'ag-grid-react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createContext, useContext } from 'react'
import type { RowCellProps } from '@/components/grid/section-grid'
import type { SectionEntry } from '@/components/grid/sections'
import { SampleTag } from '@/components/ui/sample-tag'
import type { LedgerRow } from './ledger-rows'
import type { LedgerText } from './use-ledger-text'

// How the ledger is grouped: a rental's lines together, or a month's.
export type LedgerGrouping = 'rental' | 'month'

// What every cell needs beyond its row. ag-grid-react draws each cell inside the grid's own React tree, so a change
// here reaches every cell without the grid redrawing a row.
export type LedgerGridState = { readonly text: LedgerText; readonly grouping: LedgerGrouping }
export const LedgerGridContext = createContext<LedgerGridState | null>(null)

function useLedgerGrid(): LedgerGridState {
  const state = useContext(LedgerGridContext)
  if (state === null) throw new Error('A ledger cell is drawn outside its grid.')
  return state
}

type CellProps = RowCellProps<LedgerRow>

export function WhenCell({ data }: CellProps) {
  const { text } = useLedgerGrid()
  return <span className="figures flex h-full items-center text-sm">{text.moment(data.occurredAt)}</span>
}

// What the line did; grouped by month, also whose rental it was.
export function WhatCell({ data }: CellProps) {
  const { text, grouping } = useLedgerGrid()
  return (
    <div className="grid h-full min-w-0 content-center gap-0.5 leading-snug">
      <span className="truncate font-semibold">{text.what(data)}</span>
      {grouping === 'month' ? (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm text-muted-foreground">{text.renter(data.rental)}</span>
          {data.rental.simulated ? <SampleTag /> : null}
        </span>
      ) : null}
    </div>
  )
}

export function MoneyCell({ value }: CustomCellRendererProps<SectionEntry<LedgerRow>, number | null>) {
  const { text } = useLedgerGrid()
  return typeof value === 'number' ? <span className="figures flex h-full items-center justify-end font-semibold">{text.money(value)}</span> : null
}

export function ReferenceCell({ data }: CellProps) {
  return <span className="flex h-full min-w-0 items-center font-mono text-xs"><span className="truncate">{data.paypalReference}</span></span>
}

// What a group's lines moved one way, in cents.
export function flowTotal(rows: readonly LedgerRow[], flow: LedgerRow['flow']): number {
  return rows.reduce((sum, row) => (row.flow === flow ? sum + row.amountCents : sum), 0)
}

// A group's heading across the grid, with what its lines sent to the shop and back. A rental's also says what its
// money's checks found, in words and with a sign, never by colour alone.
export function LedgerGroupLabel({ rows }: { rows: readonly LedgerRow[] }) {
  const t = useTranslations('money')
  const { text, grouping } = useLedgerGrid()
  const first = rows[0]
  if (first === undefined) return null
  const figure = (label: string, cents: number) => `${label} ${text.money(cents)}`
  const toShop = flowTotal(rows, 'to_shop')
  const back = flowTotal(rows, 'to_renter')
  if (grouping === 'month') {
    return (
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5 leading-normal">
        <span className="font-semibold">{text.month(first.month)}</span>
        <span className="figures text-sm text-muted-foreground">
          {[figure(t('group.toShop'), toShop), figure(t('group.backToRenters'), back), t('group.lines', { count: rows.length })].join(' · ')}
        </span>
      </span>
    )
  }
  const { money } = first.rental
  const agrees = money.checks.length === 0
  return (
    <span className="grid min-w-0 gap-1 py-1.5 leading-snug">
      <span className="flex min-w-0 items-center gap-x-2.5">
        <span className="truncate font-bold tracking-tight">{text.renter(first.rental)}</span>
        <span className="shrink-0 text-sm text-muted-foreground">{text.period(first.rental)}</span>
        {first.rental.simulated ? <SampleTag /> : null}
        <span className={agrees ? 'flex min-w-0 items-center gap-1.5 text-sm' : 'flex min-w-0 items-center gap-1.5 text-sm font-semibold text-destructive'}>
          {agrees ? <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" /> : <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />}
          <span className="truncate">{text.checks(money.checks)}</span>
        </span>
      </span>
      <span className="figures truncate text-sm text-muted-foreground">{[figure(t('group.toShop'), toShop), figure(t('group.backToRenter'), back), figure(t('group.heldNow'), money.heldNowCents)].join(' · ')}</span>
    </span>
  )
}
