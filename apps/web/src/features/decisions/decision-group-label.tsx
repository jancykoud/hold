'use client'

import { useTranslations } from 'next-intl'
import { BOARD_GROUPS } from './board'
import type { BoardGroup, BoardRow } from './board'
import { useGridState } from './decision-cells'

const isGroup = (key: string): key is BoardGroup => BOARD_GROUPS.some((group) => group === key)

// A group's total, from the amounts its decisions have; none when no decision in it has one.
export function amountTotal(rows: readonly BoardRow[]): number | null {
  const amounts = rows.flatMap((row) => (row.amountCents === null ? [] : [row.amountCents]))
  return amounts.length === 0 ? null : amounts.reduce((sum, value) => sum + value, 0)
}

// A group's heading across the board: the kind of decision, how many wait in it, and the total of their amounts.
export function DecisionGroupLabel({ group, rows }: { group: string; rows: readonly BoardRow[] }) {
  const t = useTranslations('decisions')
  const { text } = useGridState()
  if (!isGroup(group)) return null
  const total = amountTotal(rows)
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 leading-normal">
      <span className="font-bold tracking-tight">{t(`groups.${group}`)}</span>
      <span className="figures rounded-full bg-muted px-2.5 py-0.5 text-[0.8125rem] text-muted-foreground">
        {t('groupCount', { count: rows.length })}
        {total === null ? null : ` · ${t('groupTotal', { amount: text.money(total) })}`}
      </span>
    </span>
  )
}
