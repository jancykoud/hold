'use client'

import type { ColDef, GridApi, GridReadyEvent, RowHeightParams } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { CONTROL_COLUMN } from '@/components/grid/control-column'
import { downloadRows } from '@/components/grid/download-csv'
import { registerGridModules } from '@/components/grid/grid-modules'
import { holdGridTheme } from '@/components/grid/grid-theme'
import { createSections, sectionRowHeight, useSections } from '@/components/grid/section-grid'
import type { DetailHeading } from '@/components/grid/section-grid'
import type { SectionEntry } from '@/components/grid/sections'
import { usePopupParent } from '@/components/grid/use-popup-parent'
import { LedgerGridContext, LedgerGroupLabel, MoneyCell, ReferenceCell, WhatCell, WhenCell } from './ledger-cells'
import type { LedgerGrouping } from './ledger-cells'
import type { LedgerRow } from './ledger-rows'
import type { LedgerText } from './use-ledger-text'

registerGridModules()

type Entry = SectionEntry<LedgerRow>
const { SectionsProvider, OpenRowCell, FullWidthRow, rowCell, rowValue } = createSections<LedgerRow>()
const CONTROLS = ['open']
// What a spreadsheet gets: the month and the rental of every line, what it did and where its money went.
const EXPORTED = ['month', 'renter', 'when', 'what', 'amount', 'toShop', 'back', 'reference']

const When = rowCell(WhenCell)
const What = rowCell(WhatCell)
const Reference = rowCell(ReferenceCell)

export type LedgerGridProps = {
  rows: readonly LedgerRow[]
  text: LedgerText
  grouping: LedgerGrouping
  // What confirms a line, drawn under it when it is opened.
  renderDetail: (row: LedgerRow, heading: DetailHeading) => ReactNode
}

const idOf = (row: LedgerRow) => row.id
const byRental = (row: LedgerRow) => row.rentalId
const byMonth = (row: LedgerRow) => row.month
const renderGroup = (_group: string, rows: readonly LedgerRow[]) => <LedgerGroupLabel rows={rows} />

// The money log as a grid, for a laptop or a tablet: a rental's lines together, or a month's, each under a heading
// that adds up what went to the shop and back to renters. A click or Enter opens a line into what confirmed it.
export function LedgerGrid({ rows, text, grouping, renderDetail }: LedgerGridProps) {
  const t = useTranslations('money')
  const popupParent = usePopupParent()
  const [api, setApi] = useState<GridApi<Entry> | null>(null)
  const { entries, openIds, toggle, focusOnOpen, grid } = useSections(rows, idOf, grouping === 'rental' ? byRental : byMonth, CONTROLS)

  const columns = useMemo<ColDef<Entry>[]>(() => {
    const cents = ({ value }: { value: number | null | undefined }) => (typeof value === 'number' ? text.money(value) : '')
    return [
      { colId: 'month', headerName: t('columns.month'), valueGetter: rowValue((row) => text.month(row.month)), hide: true },
      { colId: 'renter', headerName: t('columns.renter'), valueGetter: rowValue((row) => text.renter(row.rental)), hide: true },
      { colId: 'open', headerName: t('columns.open'), cellRenderer: OpenRowCell, ...CONTROL_COLUMN },
      // Room for the widest moment, a two-figure day with a two-figure hour, as in "Nov 10, 10:00 AM".
      { colId: 'when', headerName: t('columns.when'), cellRenderer: When, valueGetter: rowValue((row) => row.occurredAt.getTime()), valueFormatter: ({ data }) => (data?.kind === 'row' ? text.moment(data.row.occurredAt) : ''), width: 184, minWidth: 176 },
      { colId: 'what', headerName: t('columns.what'), cellRenderer: What, valueGetter: rowValue((row) => text.what(row)), flex: 2, minWidth: 180, sortable: false },
      { colId: 'amount', headerName: t('columns.amount'), cellRenderer: MoneyCell, valueGetter: rowValue((row) => row.amountCents), valueFormatter: cents, width: 116, minWidth: 108, type: 'rightAligned' },
      { colId: 'toShop', headerName: t('columns.toShop'), cellRenderer: MoneyCell, valueGetter: rowValue((row) => (row.flow === 'to_shop' ? row.amountCents : null)), valueFormatter: cents, width: 124, minWidth: 116, type: 'rightAligned' },
      { colId: 'back', headerName: t('columns.back'), cellRenderer: MoneyCell, valueGetter: rowValue((row) => (row.flow === 'to_renter' ? row.amountCents : null)), valueFormatter: cents, width: 156, minWidth: 148, type: 'rightAligned' },
      { colId: 'reference', headerName: t('columns.reference'), cellRenderer: Reference, valueGetter: rowValue((row) => row.paypalReference), flex: 1, minWidth: 120, sortable: false },
    ]
  }, [t, text])

  const getRowHeight = useCallback(({ data }: RowHeightParams<Entry>) => sectionRowHeight(data, grouping === 'rental' ? 68 : 52), [grouping])
  const onGridReady = useCallback((event: GridReadyEvent<Entry>) => { setApi(event.api) }, [])
  // The lines shown, every cell as the grid words it, for the shop's accountant.
  const download = useCallback(() => { if (api !== null) downloadRows(api, 'hold-money-log.csv', EXPORTED) }, [api])

  const state = useMemo(() => ({ text, grouping }), [text, grouping])
  const sections = useMemo(
    () => ({ openIds, toggle, focusOnOpen, idOf, nameOf: text.lineName, toggleLabel: (row: LedgerRow, open: boolean) => t(open ? 'closeLine' : 'openLine', { line: text.lineName(row) }), renderDetail, renderGroup }),
    [openIds, toggle, focusOnOpen, text, t, renderDetail],
  )
  return (
    <LedgerGridContext.Provider value={state}>
      <SectionsProvider value={sections}>
        <div className="grid min-w-0 gap-3">
          <Button type="button" variant="outline" className="min-h-11 justify-self-start" disabled={api === null} onClick={download}>
            <Download aria-hidden="true" />
            {t('download')}
          </Button>
          <div className="hold-grid min-w-0" role="region" aria-label={t('grid')}>
            <AgGridReact<Entry>
              theme={holdGridTheme}
              popupParent={popupParent}
              rowData={entries}
              columnDefs={columns}
              {...grid}
              fullWidthCellRenderer={FullWidthRow}
              rowHeight={60}
              getRowHeight={getRowHeight}
              domLayout="autoHeight"
              ensureDomOrder
              suppressMovableColumns
              animateRows={false}
              onGridReady={onGridReady}
            />
          </div>
        </div>
      </SectionsProvider>
    </LedgerGridContext.Provider>
  )
}
