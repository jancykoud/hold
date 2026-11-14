'use client'

import type { ColDef, GridApi, GridReadyEvent, IRowNode, RowHeightParams, SelectionChangedEvent } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { useTranslations } from 'next-intl'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CONTROL_COLUMN } from '@/components/grid/control-column'
import { registerGridModules } from '@/components/grid/grid-modules'
import { holdGridTheme } from '@/components/grid/grid-theme'
import { RowMenu } from '@/components/grid/row-menu'
import type { RowMenuItem } from '@/components/grid/row-menu'
import { createSections, sectionRowHeight, useSections } from '@/components/grid/section-grid'
import type { DetailHeading, RowCellProps } from '@/components/grid/section-grid'
import type { SectionEntry } from '@/components/grid/sections'
import { usePopupParent } from '@/components/grid/use-popup-parent'
import { useRouter } from '@/i18n/navigation'
import { itemRoutes, rentalRoutes } from '@/lib/routes'
import type { BoardRow } from './board'
import { AmountCell, ChooseCell, DecisionCell, DueCell, GridStateContext } from './decision-cells'
import { DecisionGroupLabel } from './decision-group-label'
import type { RowText } from './use-row-text'

registerGridModules()

type Entry = SectionEntry<BoardRow>
const { SectionsProvider, OpenRowCell, FullWidthRow, rowCell, rowValue } = createSections<BoardRow>()
// The controls on a decision's row that do their own thing when clicked.
const CONTROLS = ['open', 'choose', 'more']

// Where else a decision leads, and the words for the button that offers it.
type MoreState = { readonly label: (row: BoardRow) => string; readonly items: (row: BoardRow) => readonly RowMenuItem[] }
const MoreContext = createContext<MoreState | null>(null)

// Only ways to read a decision: its claim page, its rental or its item, and nothing that moves money.
function MoreCell({ data }: RowCellProps<BoardRow>) {
  const more = useContext(MoreContext)
  return more === null ? null : <RowMenu label={more.label(data)} items={more.items(data)} />
}

const Choose = rowCell(ChooseCell)
const Decision = rowCell(DecisionCell)
const Due = rowCell(DueCell)
const Amount = rowCell(AmountCell)
const More = rowCell(MoreCell)

export type DecisionGridProps = {
  rows: readonly BoardRow[]
  text: RowText
  // Grouped by kind when more than one kind is shown.
  grouped: boolean
  selectedIds: ReadonlySet<string>
  onSelect: (ids: readonly string[]) => void
  // A decision's evidence and actions, drawn under its row when it is opened; the heading takes the focus when Enter
  // opened it.
  renderDetail: (row: BoardRow, heading: DetailHeading) => ReactNode
}

// Missing dates and amounts sort last, whichever way the column is sorted.
const lastWhenMissing = (first: number | null, second: number | null, _a: unknown, _b: unknown, descending: boolean) => {
  if (first === null || second === null) return first === second ? 0 : (first === null) !== descending ? 1 : -1
  return first - second
}

const idOf = (row: BoardRow) => row.id
const groupOf = (row: BoardRow) => row.group
const getRowHeight = ({ data }: RowHeightParams<Entry>) => sectionRowHeight(data, 52)
const renderGroup = (group: string, rows: readonly BoardRow[]) => <DecisionGroupLabel group={group} rows={rows} />

// The board as a grid, for a laptop or a tablet: one row per decision, grouped by kind with the group holding the most
// urgent decision first, in the order they fall due within it unless a column is sorted. A click or Enter opens a
// decision under its row, with its evidence and what can be done; arrow keys move between decisions.
export function DecisionGrid({ rows, text, grouped, selectedIds, onSelect, renderDetail }: DecisionGridProps) {
  const t = useTranslations('decisions')
  const popupParent = usePopupParent()
  const router = useRouter()
  const [api, setApi] = useState<GridApi<Entry> | null>(null)
  const selectable = rows.some((row) => row.selectable)
  const { entries, openIds, toggle, focusOnOpen, grid } = useSections(rows, idOf, grouped ? groupOf : undefined, CONTROLS)

  const columns = useMemo<ColDef<Entry>[]>(() => [
    { colId: 'open', headerName: t('columns.open'), cellRenderer: OpenRowCell, ...CONTROL_COLUMN },
    { colId: 'choose', headerName: t('columns.choose'), cellRenderer: Choose, ...CONTROL_COLUMN, hide: !selectable },
    { colId: 'decision', headerName: t('columns.decision'), cellRenderer: Decision, flex: 3, minWidth: 260, sortable: false },
    // Room for a whole moment, such as "Nov 13, 06:00 PM", beside the row's menu.
    { colId: 'due', headerName: t('columns.due'), cellRenderer: Due, valueGetter: rowValue((row) => row.due?.getTime() ?? null), comparator: lastWhenMissing, flex: 1, minWidth: 196 },
    { colId: 'amount', headerName: t('columns.amount'), cellRenderer: Amount, valueGetter: rowValue((row) => row.amountCents), comparator: lastWhenMissing, width: 132, minWidth: 116, type: 'rightAligned' },
    { colId: 'more', headerName: t('columns.more'), cellRenderer: More, ...CONTROL_COLUMN },
  ], [t, selectable])

  // The page's choice of releases, also made in the phone's list, kept in step with the grid's own.
  useEffect(() => {
    api?.forEachNode((node: IRowNode<Entry>) => {
      if (node.data?.kind !== 'row') return
      const chosen = selectedIds.has(node.data.row.id)
      if (node.isSelected() !== chosen) node.setSelected(chosen, false, 'api')
    })
  }, [api, selectedIds, entries])

  const onGridReady = useCallback((event: GridReadyEvent<Entry>) => { setApi(event.api) }, [])
  const onSelectionChanged = useCallback((event: SelectionChangedEvent<Entry>) => {
    if (event.source === 'api') return
    onSelect(event.api.getSelectedRows().flatMap((entry) => (entry.kind === 'row' ? [entry.row.id] : [])))
  }, [onSelect])
  const more = useMemo<MoreState>(() => ({
    label: (row) => t('menu.more', { title: text.title(row) }),
    items: (row) => [
      ...((row.kind === 'claim' || row.kind === 'contested' || row.kind === 'escalated') && row.rentalId !== null ? [{ name: t('menu.claim'), action: () => { router.push(rentalRoutes.claim(row.rentalId ?? '')) } }] : []),
      ...(row.rentalId === null ? [] : [{ name: t('menu.rental'), action: () => { router.push(rentalRoutes.rental(row.rentalId ?? '')) } }]),
      ...(row.kind === 'repair' ? [{ name: t('menu.passport'), action: () => { router.push(itemRoutes.item(row.itemId)) } }] : []),
    ],
  }), [t, text, router])

  const state = useMemo(() => ({ text, selectedIds }), [text, selectedIds])
  const sections = useMemo(
    () => ({ openIds, toggle, focusOnOpen, idOf, nameOf: text.heading, toggleLabel: (row: BoardRow, open: boolean) => t(open ? 'closeEvidence' : 'openEvidence', { title: text.title(row) }), renderDetail, renderGroup }),
    [openIds, toggle, focusOnOpen, text, t, renderDetail],
  )
  return (
    <GridStateContext.Provider value={state}>
      <MoreContext.Provider value={more}>
        <SectionsProvider value={sections}>
          <div className="hold-grid min-w-0" role="region" aria-label={t('grid')}>
            <AgGridReact<Entry>
              theme={holdGridTheme}
              popupParent={popupParent}
              rowData={entries}
              columnDefs={columns}
              {...grid}
              fullWidthCellRenderer={FullWidthRow}
              // Three lines a decision: what, about whom, and who decides.
              rowHeight={84}
              getRowHeight={getRowHeight}
              domLayout="autoHeight"
              ensureDomOrder
              suppressMovableColumns
              suppressDragLeaveHidesColumns
              animateRows={false}
              rowSelection={{ mode: 'multiRow', checkboxes: false, headerCheckbox: false, enableClickSelection: false, isRowSelectable: (node) => node.data?.kind === 'row' && node.data.row.selectable }}
              onGridReady={onGridReady}
              onSelectionChanged={onSelectionChanged}
            />
          </div>
        </SectionsProvider>
      </MoreContext.Provider>
    </GridStateContext.Provider>
  )
}
