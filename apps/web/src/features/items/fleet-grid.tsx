'use client'

import type { CellKeyDownEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent, PostSortRowsParams } from 'ag-grid-community'
import type { CustomCellRendererProps } from 'ag-grid-react'
import { AgGridReact } from 'ag-grid-react'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CONTROL_COLUMN } from '@/components/grid/control-column'
import { registerGridModules } from '@/components/grid/grid-modules'
import { holdGridTheme } from '@/components/grid/grid-theme'
import { RowMenu } from '@/components/grid/row-menu'
import type { RowMenuItem } from '@/components/grid/row-menu'
import { usePopupParent } from '@/components/grid/use-popup-parent'
import type { ShopClock } from '@/hooks/use-shop-format'
import { useShopFormat } from '@/hooks/use-shop-format'
import { useRouter } from '@/i18n/navigation'
import { itemRoutes } from '@/lib/routes'
import { FleetCountCell, FleetFindingsCell, FleetGridContext, FleetNameCell, FleetRecoveredCell, FleetStandingCell } from './fleet-cells'
import { keepItemsUnderTypes } from './fleet-rows'
import type { FleetItemRow, FleetRow, FleetTotals } from './fleet-rows'

registerGridModules()

// The grid sits inside its card, which draws the edge.
const FLEET_THEME = holdGridTheme.withParams({ wrapperBorder: false })
const EXPORTED = ['type', 'name', 'standing', 'rentals', 'daysOut', 'damage', 'incurred', 'recovered', 'repairCost', 'repairMargin', 'openRepairs', 'marks', 'signal']

// A figure of the row: an item's own, or for a type, its items added up.
const figure = (ofItem: (row: FleetItemRow) => number | null, ofType: (totals: FleetTotals) => number | null) => ({ data }: { data: FleetRow | undefined }) => (data === undefined ? null : data.kind === 'item' ? ofItem(data) : ofType(data.totals))
const getRowId = ({ data }: GetRowIdParams<FleetRow>) => data.id
const postSortRows = ({ nodes }: PostSortRowsParams<FleetRow>) => { keepItemsUnderTypes(nodes) }

// Where else a row leads, and the words for the button that offers it.
type MoreState = { readonly label: (row: FleetRow) => string; readonly items: (row: FleetRow) => readonly RowMenuItem[] }
const MoreContext = createContext<MoreState | null>(null)

function FleetMoreCell({ data }: CustomCellRendererProps<FleetRow>) {
  const more = useContext(MoreContext)
  return more === null || data === undefined ? null : <RowMenu label={more.label(data)} items={more.items(data)} />
}

export type FleetGridProps = { rows: readonly FleetRow[]; clock: ShopClock; canManage: boolean }

// The fleet as a grid, for a laptop or a tablet: each type with its items below it and added up, what their rentals say
// about each item this year, and the item in each type wearing fastest. Enter on an item opens its passport.
export function FleetGrid({ rows, clock, canManage }: FleetGridProps) {
  const t = useTranslations('shop.items.fleet')
  const items = useTranslations('shop.items')
  const format = useShopFormat(clock)
  const router = useRouter()
  const popupParent = usePopupParent()
  const [api, setApi] = useState<GridApi<FleetRow> | null>(null)

  const columns = useMemo<ColDef<FleetRow>[]>(() => {
    const cents = ({ value }: { value: number | null | undefined }) => (typeof value === 'number' ? format.money(value) : '')
    const centsOrDash = ({ value }: { value: number | null | undefined }) => (typeof value === 'number' ? format.money(value) : '—')
    return [
      { colId: 'type', headerName: t('columns.type'), valueGetter: ({ data }) => data?.type.name, hide: true },
      { colId: 'name', headerName: t('columns.item'), cellRenderer: FleetNameCell, valueGetter: ({ data }) => (data?.kind === 'item' ? data.item.label : ''), minWidth: 260, flex: 2 },
      // The signal shows beside the item's name, and has a column of its own in the spreadsheet.
      { colId: 'signal', headerName: t('columns.signal'), valueGetter: ({ data }) => (data?.kind === 'item' && data.fastest ? t('fastest') : ''), hide: true },
      // Room for the longest standing in any language, French's "En vérification", and for Linux drawing type a little wider.
      { colId: 'standing', headerName: t('columns.standing'), cellRenderer: FleetStandingCell, valueGetter: ({ data }) => (data?.kind === 'item' ? items(`standing.${data.item.standing}`) : ''), width: 180, minWidth: 172, sortable: false },
      { colId: 'rentals', headerName: t('columns.rentals'), cellRenderer: FleetCountCell, valueGetter: figure((row) => row.wear.rentals, (totals) => totals.rentals), width: 100, minWidth: 96, type: 'rightAligned' },
      { colId: 'daysOut', headerName: t('columns.daysOut'), cellRenderer: FleetCountCell, valueGetter: figure((row) => row.wear.daysOut, (totals) => totals.daysOut), width: 108, minWidth: 104, type: 'rightAligned' },
      { colId: 'findings', headerName: t('columns.findings'), cellRenderer: FleetFindingsCell, width: 120, minWidth: 112, sortable: false },
      { colId: 'damage', headerName: t('columns.damage'), valueGetter: figure((row) => row.wear.damageFindings, (totals) => totals.damageFindings), hide: true },
      // Priced and recovered are read together on screen, and kept apart for the spreadsheet.
      { colId: 'incurred', headerName: t('columns.incurred'), valueGetter: figure((row) => row.wear.incurredCents, (totals) => totals.incurredCents), valueFormatter: cents, hide: true },
      { colId: 'recovered', headerName: t('columns.recovered'), cellRenderer: FleetRecoveredCell, valueGetter: figure((row) => row.wear.recoveredCents, (totals) => totals.recoveredCents), valueFormatter: cents, width: 176, minWidth: 168, type: 'rightAligned' },
      // What repairs cost against what the damage recovered (architecture.md section 9.6): above nothing, the price list
      // paid for the repairs; below, it did not.
      { colId: 'repairCost', headerName: t('columns.repairCost'), valueGetter: figure((row) => row.repairCostCents, (totals) => totals.repairCostCents), valueFormatter: centsOrDash, width: 140, minWidth: 128, type: 'rightAligned' },
      { colId: 'repairMargin', headerName: t('columns.repairMargin'), valueGetter: figure((row) => row.repairMarginCents, (totals) => totals.repairMarginCents), valueFormatter: ({ value }: { value: number | null | undefined }) => (typeof value === 'number' ? `${value > 0 ? '+' : value < 0 ? '−' : ''}${format.money(Math.abs(value))}` : '—'), cellClassRules: { 'text-success': ({ value }: { value: unknown }) => typeof value === 'number' && value > 0, 'text-destructive': ({ value }: { value: unknown }) => typeof value === 'number' && value < 0 }, width: 176, minWidth: 160, type: 'rightAligned' },
      { colId: 'openRepairs', headerName: t('columns.openRepairs'), cellRenderer: FleetCountCell, valueGetter: figure((row) => row.openRepairs, (totals) => totals.openRepairs), width: 128, minWidth: 120, type: 'rightAligned' },
      { colId: 'marks', headerName: t('columns.marks'), cellRenderer: FleetCountCell, valueGetter: figure((row) => row.openMarks, (totals) => totals.openMarks), width: 112, minWidth: 104, type: 'rightAligned' },
      { colId: 'more', headerName: t('columns.more'), cellRenderer: FleetMoreCell, ...CONTROL_COLUMN },
    ]
  }, [t, items, format])

  const onGridReady = useCallback((event: GridReadyEvent<FleetRow>) => { setApi(event.api) }, [])
  const onCellKeyDown = useCallback((event: CellKeyDownEvent<FleetRow>) => {
    if (event.data?.kind === 'item' && event.column.getColId() !== 'more' && event.event instanceof KeyboardEvent && event.event.key === 'Enter') router.push(itemRoutes.item(event.data.item.id))
  }, [router])
  // Only ways to read or change a row through its own page: the passport, its status, and its type's hold.
  const more = useMemo<MoreState>(() => ({
    label: (row) => t('menu.more', { name: row.kind === 'item' ? row.item.label : row.type.name }),
    items: (row) => {
      const hold = canManage && !row.type.simulated ? [{ name: t('menu.hold', { name: row.type.name }), action: () => { router.push(`${itemRoutes.type(row.type.id)}#hold`) } }] : []
      if (row.kind === 'type') return [{ name: t('menu.type'), action: () => { router.push(itemRoutes.type(row.type.id)) } }, ...hold]
      return [
        { name: t('menu.passport'), action: () => { router.push(itemRoutes.item(row.item.id)) } },
        { name: t('menu.status'), action: () => { router.push(`${itemRoutes.item(row.item.id)}#status`) } },
        ...hold,
      ]
    },
  }), [canManage, t, router])
  // The rows shown, types and items, every cell as the grid words it.
  const download = useCallback(() => {
    api?.exportDataAsCsv({ fileName: 'hold-fleet.csv', columnKeys: EXPORTED, allColumns: true, processCellCallback: ({ value, formatValue }) => formatValue(value) })
  }, [api])

  const rowData = useMemo(() => [...rows], [rows])
  const state = useMemo(() => ({ money: format.money }), [format])
  return (
    <FleetGridContext.Provider value={state}>
      <MoreContext.Provider value={more}>
      <div className="surface min-w-0 overflow-clip">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border/70 px-4 py-3 md:px-5">
          <p className="label text-xs text-muted-foreground">{t('grid')}</p>
          <Button type="button" variant="outline" disabled={api === null} onClick={download}>
            <Download aria-hidden="true" />
            {t('download')}
          </Button>
        </div>
        <div className="hold-grid min-w-0" role="region" aria-label={t('grid')}>
          <AgGridReact<FleetRow>
            theme={FLEET_THEME}
            popupParent={popupParent}
            rowData={rowData}
            columnDefs={columns}
            getRowId={getRowId}
            postSortRows={postSortRows}
            // Room for an item's name, and its signal under it where they do not fit side by side.
            rowHeight={68}
            domLayout="autoHeight"
            ensureDomOrder
            suppressMovableColumns
            // Ten columns at most: every cell is drawn, so a column scrolled out of sight is still read by a screen reader.
            suppressColumnVirtualisation
            animateRows={false}
            onGridReady={onGridReady}
            onCellKeyDown={onCellKeyDown}
          />
        </div>
        <p className="border-t border-border/70 px-4 py-3 text-sm text-muted-foreground md:px-5">{t('keys')}</p>
      </div>
      </MoreContext.Provider>
    </FleetGridContext.Provider>
  )
}
