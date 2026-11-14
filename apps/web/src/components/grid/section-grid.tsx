'use client'

import type { CellClickedEvent, CellKeyDownEvent, GetRowIdParams, IRowNode, IsFullWidthRowParams, PostSortRowsParams, ValueGetterParams } from 'ag-grid-community'
import type { CustomCellRendererProps } from 'ag-grid-react'
import { ChevronRight } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType, ReactNode, Ref, RefObject } from 'react'
import { arrangeSections, sectionEntries } from './sections'
import type { SectionEntry } from './sections'

// A grid in sections, drawn by AG Grid Community: a heading across the grid for each group, and a row that opens in
// place under itself, with a button to open and close it and a click or Enter on the row doing the same. Opened by
// Enter, the opened row's heading takes the focus, so a screen reader starts reading there. The decision board, the
// money log and the open scorecard are built on it; sections.ts puts the rows in order.

export type DetailHeading = { readonly ref: Ref<HTMLHeadingElement> }

// What one of a row's cells is given: the row itself, and the grid's own node for it.
export type RowCellProps<Row> = { readonly data: Row; readonly node: IRowNode<SectionEntry<Row>> }

type Toggle<Row> = (row: Row, options?: { readonly focus: boolean }) => void

export type Sections<Row> = {
  readonly openIds: ReadonlySet<string>
  readonly toggle: Toggle<Row>
  readonly focusOnOpen: RefObject<string | null>
  readonly idOf: (row: Row) => string
  // Names the opened row's region, and says what the button does for a row.
  readonly nameOf: (row: Row) => string
  readonly toggleLabel: (row: Row, open: boolean) => string
  readonly renderDetail: (row: Row, heading: DetailHeading) => ReactNode
  // A group's heading, from its key and its rows. Not asked for when the rows are not grouped.
  readonly renderGroup?: (group: string, rows: readonly Row[]) => ReactNode
}

// A detail is drawn at this height until its content has been measured.
const DETAIL_HEIGHT_BEFORE_MEASURE = 240

const getRowId = <Row,>({ data }: GetRowIdParams<SectionEntry<Row>>) => data.id
const isFullWidthRow = <Row,>({ rowNode }: IsFullWidthRowParams<SectionEntry<Row>>) => rowNode.data !== undefined && rowNode.data.kind !== 'row'
const postSortRows = <Row,>({ nodes }: PostSortRowsParams<SectionEntry<Row>>) => { arrangeSections(nodes) }

// The rows of the grid with their headings and opened details, which rows are open, and the grid's click and key
// handlers that open and close them. A click on one of the row's own controls, named by their columns, is left to the
// control. Rows are grouped when groupOf is given.
export function useSections<Row>(rows: readonly Row[], idOf: (row: Row) => string, groupOf: ((row: Row) => string) | undefined, controls: readonly string[]) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set())
  const focusOnOpen = useRef<string | null>(null)
  const toggle = useCallback<Toggle<Row>>((row, options) => {
    const id = idOf(row)
    setOpenIds((open) => {
      const next = new Set(open)
      focusOnOpen.current = options?.focus === true && !open.has(id) ? id : null
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [idOf])
  const onCellClicked = useCallback((event: CellClickedEvent<SectionEntry<Row>>) => {
    if (event.data?.kind !== 'row' || controls.includes(event.column.getColId())) return
    toggle(event.data.row)
  }, [toggle, controls])
  const onCellKeyDown = useCallback((event: CellKeyDownEvent<SectionEntry<Row>>) => {
    if (event.data?.kind === 'row' && event.event instanceof KeyboardEvent && event.event.key === 'Enter') toggle(event.data.row, { focus: true })
  }, [toggle])
  // A new array only when the rows or what is open change, so nothing else makes the grid compare its rows again.
  const entries = useMemo(() => [...sectionEntries(rows, { idOf, ...(groupOf === undefined ? {} : { groupOf }), openIds })], [rows, idOf, groupOf, openIds])
  return { entries, openIds, toggle, focusOnOpen, grid: { getRowId, isFullWidthRow, postSortRows, onCellClicked, onCellKeyDown } }
}

// The context, cells and full-width rows for one kind of row. Made once per grid at the top of its module.
export function createSections<Row>() {
  const Context = createContext<Sections<Row> | null>(null)
  function useSectionsContext(): Sections<Row> {
    const state = useContext(Context)
    if (state === null) throw new Error('A row of a grid in sections is drawn outside its grid.')
    return state
  }

  // A column's value for a row; a heading and a detail have none.
  function rowValue<Value>(read: (row: Row) => Value) {
    return ({ data }: ValueGetterParams<SectionEntry<Row>>): Value | null => (data?.kind === 'row' ? read(data.row) : null)
  }

  // A cell that draws a row, as a cell of the grid, which also holds headings and details.
  function rowCell(Cell: ComponentType<RowCellProps<Row>>) {
    return function RowCell({ data, node }: CustomCellRendererProps<SectionEntry<Row>>) {
      return data?.kind === 'row' ? <Cell data={data.row} node={node} /> : null
    }
  }

  // A real button, 44 pixels square, saying which way it goes.
  function OpenRowCell({ data }: CustomCellRendererProps<SectionEntry<Row>>) {
    const { openIds, toggle, toggleLabel, idOf } = useSectionsContext()
    if (data?.kind !== 'row') return null
    const open = openIds.has(idOf(data.row))
    return (
      <span className="flex h-full items-center">
        <button
          type="button"
          aria-expanded={open}
          aria-label={toggleLabel(data.row, open)}
          onClick={() => { toggle(data.row) }}
          className={open ? 'grid size-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors' : 'grid size-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'}
        >
          <ChevronRight aria-hidden="true" className={open ? 'size-4 rotate-90 transition-transform duration-300 ease-spring motion-reduce:transition-none' : 'size-4 transition-transform duration-300 ease-spring motion-reduce:transition-none'} />
        </button>
      </span>
    )
  }

  // The opened row, one cell across the whole grid. Its height is its content's: the grid cannot size such a row
  // itself, so the content is measured and the row told, again whenever the content changes size.
  function DetailRow({ row, node, api }: { row: Row } & Pick<CustomCellRendererProps<SectionEntry<Row>>, 'node' | 'api'>) {
    const { idOf, nameOf, focusOnOpen, renderDetail } = useSectionsContext()
    const heading = useRef<HTMLHeadingElement>(null)
    const content = useRef<HTMLElement>(null)
    useEffect(() => {
      if (focusOnOpen.current !== idOf(row)) return
      focusOnOpen.current = null
      heading.current?.focus()
    }, [row, focusOnOpen, idOf])
    useEffect(() => {
      const element = content.current
      if (element === null) return
      const fit = () => {
        const height = Math.ceil(element.getBoundingClientRect().height)
        if (height === 0 || height === node.rowHeight) return
        node.setRowHeight(height)
        api.onRowHeightChanged()
      }
      const observer = new ResizeObserver(fit)
      observer.observe(element)
      fit()
      return () => { observer.disconnect() }
    }, [node, api])
    return (
      <div role="gridcell" className="min-w-0">
        <section ref={content} aria-label={nameOf(row)} className="@container relative min-w-0 bg-[color-mix(in_oklab,var(--muted)_45%,var(--card))] px-5 py-6 whitespace-normal text-foreground md:px-8 md:py-7">
          <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary" />
          <div className="max-w-5xl animate-fade">{renderDetail(row, { ref: heading })}</div>
        </section>
      </div>
    )
  }

  // A heading or an opened detail: the rows of the grid that are one cell across it.
  function FullWidthRow({ data, node, api }: CustomCellRendererProps<SectionEntry<Row>>) {
    const { renderGroup } = useSectionsContext()
    if (data === undefined || data.kind === 'row') return null
    if (data.kind === 'detail') return <DetailRow row={data.row} node={node} api={api} />
    return (
      <div role="gridcell" data-section-heading className="flex h-full min-w-0 items-center px-5">
        {renderGroup?.(data.group, data.rows)}
      </div>
    )
  }

  return { SectionsProvider: Context.Provider, OpenRowCell, FullWidthRow, rowCell, rowValue }
}

// The height of a heading or of a detail not yet measured; a row's own height is the grid's.
export function sectionRowHeight<Row>(entry: SectionEntry<Row> | undefined, headingHeight: number): number | undefined {
  if (entry === undefined || entry.kind === 'row') return undefined
  return entry.kind === 'group' ? headingHeight : DETAIL_HEIGHT_BEFORE_MEASURE
}
