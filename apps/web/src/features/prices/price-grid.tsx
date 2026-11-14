'use client'

import { PRICE_CATEGORIES } from '@hold/domain'
import type { PriceCategory, PriceCellProblems } from '@hold/domain'
import type { CellClassParams, ColDef, GridApi, GridReadyEvent, RowDragEndEvent, ValueSetterParams } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { CONTROL_COLUMN } from '@/components/grid/control-column'
import { registerGridModules } from '@/components/grid/grid-modules'
import { holdGridTheme } from '@/components/grid/grid-theme'
import { usePopupParent } from '@/components/grid/use-popup-parent'
import { clipboardCells } from './clipboard-cells'
import type { EditorRow, PasteTarget } from './editor-model'
import { AmountCell, DescriptionCell, MoreCell, PriceGridContext, RemoveCell } from './price-cells'

registerGridModules()

// The grid sits inside the editor's card, which draws the edge.
const PRICE_THEME = holdGridTheme.withParams({ wrapperBorder: false })

const PASTE_COLUMNS: Readonly<Record<string, PasteTarget['column']>> = { description: 'description', kind: 'kind', amount: 'amount' }
const EXPORTED = ['description', 'kind', 'amount']

export type PriceGridProps = {
  rows: readonly EditorRow[]
  currency: string
  problems: ReadonlyMap<number, PriceCellProblems>
  onChange: (key: number, change: Partial<Omit<EditorRow, 'key'>>) => void
  onRemove: (key: number) => void
  onMove: (key: number, toIndex: number) => void
  onInsert: (atIndex: number) => void
  // A block of cells pasted at the focused cell, from a spreadsheet.
  onPasteCells: (target: PasteTarget, cells: readonly (readonly string[])[]) => void
  onUndo: () => void
  onRedo: () => void
}

const editing = (target: EventTarget) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

// The draft as an editable grid: each price a row, in the order renters read them, a cell copied out and cells from a
// spreadsheet pasted in at the focused cell. Neither an edit nor a paste changes a row in place: each goes to the draft
// as one step of the undo history, and the grid is given the new rows.
export function PriceGrid({ rows, currency, problems, onChange, onRemove, onMove, onInsert, onPasteCells, onUndo, onRedo }: PriceGridProps) {
  const t = useTranslations('shop.priceEditor')
  const popupParent = usePopupParent()
  const categories = useTranslations('shop.prices.categories')
  const kinds = useMemo(() => Object.fromEntries(PRICE_CATEGORIES.map((category) => [category, categories(category)])) as Record<PriceCategory, string>, [categories])
  const [api, setApi] = useState<GridApi<EditorRow> | null>(null)
  const setter = useCallback((field: 'description' | 'category' | 'amount') => (params: ValueSetterParams<EditorRow>) => {
    const value = typeof params.newValue === 'string' ? params.newValue : ''
    if (value !== params.data[field]) onChange(params.data.key, { [field]: field === 'category' ? (PRICE_CATEGORIES.find((each) => each === value) ?? 'damage') : value })
    // The grid keeps nothing itself: the new rows arrive from the draft.
    return false
  }, [onChange])
  const columns = useMemo<ColDef<EditorRow>[]>(() => {
    // A cell with a problem is marked, and says what it is under its value.
    const problemIn = (field: 'description' | 'amount') => ({ 'price-cell-problem': (params: CellClassParams<EditorRow>) => params.data !== undefined && problems.get(params.data.key)?.[field] !== undefined })
    return [
      { colId: 'order', headerName: t('columns.order'), rowDrag: true, width: 84, maxWidth: 84, valueGetter: ({ node }) => (node?.rowIndex ?? 0) + 1, sortable: false },
      { colId: 'description', headerName: t('columns.description'), field: 'description', editable: true, valueSetter: setter('description'), cellRenderer: DescriptionCell, cellClassRules: problemIn('description'), flex: 3, minWidth: 200, sortable: false },
      { colId: 'kind', headerName: t('columns.kind'), field: 'category', editable: true, valueSetter: setter('category'), cellEditor: 'agSelectCellEditor', cellEditorParams: { values: [...PRICE_CATEGORIES] }, refData: kinds, flex: 1, minWidth: 140, sortable: false },
      { colId: 'amount', headerName: t('columns.amount', { currency }), field: 'amount', editable: true, valueSetter: setter('amount'), cellRenderer: AmountCell, cellClassRules: problemIn('amount'), flex: 2, minWidth: 150, type: 'rightAligned', sortable: false },
      { colId: 'remove', headerName: t('columns.remove'), cellRenderer: RemoveCell, width: 92, maxWidth: 92, sortable: false },
      { colId: 'more', headerName: t('columns.more'), cellRenderer: MoreCell, ...CONTROL_COLUMN },
    ]
  }, [t, currency, kinds, setter, problems])
  const rowData = useMemo(() => [...rows], [rows])
  const state = useMemo(() => ({ currency, problems, onRemove, onInsert }), [currency, problems, onRemove, onInsert])
  const onRowDragEnd = useCallback((event: RowDragEndEvent<EditorRow>) => {
    if (event.node.data !== undefined) onMove(event.node.data.key, event.overIndex)
  }, [onMove])
  const onGridReady = useCallback((event: GridReadyEvent<EditorRow>) => { setApi(event.api) }, [])
  // A paste onto the grid is the draft's to make, as one change read by Hold's own rules, never the grid's cell by cell.
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const focused = api?.getFocusedCell() ?? null
    if (editing(event.target) || focused === null) return
    const cells = clipboardCells(event.clipboardData.getData('text/plain'))
    if (cells.length === 0) return
    event.preventDefault()
    onPasteCells({ rowIndex: focused.rowIndex, column: PASTE_COLUMNS[focused.column.getColId()] ?? 'description' }, cells)
  }
  // The focused cell is copied as it reads on screen, a kind by its name, so it pastes back into the grid or a spreadsheet.
  const onCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    const focused = api?.getFocusedCell() ?? null
    const node = focused === null ? undefined : api?.getDisplayedRowAtIndex(focused.rowIndex)
    if (editing(event.target) || focused === null || node === undefined || api === null) return
    const text = api.getCellValue({ rowNode: node, colKey: focused.column, useFormatter: true })
    if (text === null || text === undefined || text === '') return
    event.preventDefault()
    event.clipboardData.setData('text/plain', text)
  }
  // The draft as it stands, as the grid words it, for the shop's own records.
  const download = useCallback(() => {
    api?.exportDataAsCsv({ fileName: 'hold-price-list-draft.csv', columnKeys: EXPORTED, processCellCallback: ({ value, formatValue }) => formatValue(value) })
  }, [api])
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (editing(event.target) || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
    event.preventDefault()
    if (event.shiftKey) onRedo()
    else onUndo()
  }
  return (
    <PriceGridContext.Provider value={state}>
      <div className="grid min-w-0">
        <div className="flex justify-end border-b border-border/70 px-3 py-1.5">
          <Button type="button" variant="ghost" disabled={api === null} onClick={download}>
            <Download aria-hidden="true" />
            {t('download')}
          </Button>
        </div>
        <div className="hold-grid min-w-0" role="region" aria-label={t('grid.label')} onKeyDown={onKeyDown} onPaste={onPaste} onCopy={onCopy}>
          <AgGridReact<EditorRow>
            theme={PRICE_THEME}
            popupParent={popupParent}
            rowData={rowData}
            columnDefs={columns}
            getRowId={({ data }) => String(data.key)}
            rowHeight={56}
            domLayout="autoHeight"
            ensureDomOrder
            suppressMovableColumns
            animateRows={false}
            rowDragManaged
            stopEditingWhenCellsLoseFocus
            singleClickEdit={false}
            onGridReady={onGridReady}
            onRowDragEnd={onRowDragEnd}
          />
        </div>
      </div>
    </PriceGridContext.Provider>
  )
}
