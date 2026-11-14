'use client'

import type { ColDef, GridApi, GridReadyEvent, RowHeightParams } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { CONTROL_COLUMN } from '@/components/grid/control-column'
import { downloadRows } from '@/components/grid/download-csv'
import { registerGridModules } from '@/components/grid/grid-modules'
import { holdGridTheme } from '@/components/grid/grid-theme'
import { createSections, sectionRowHeight, useSections } from '@/components/grid/section-grid'
import type { DetailHeading } from '@/components/grid/section-grid'
import type { SectionEntry } from '@/components/grid/sections'
import { usePopupParent } from '@/components/grid/use-popup-parent'
import { AlignmentCell, CaseGroupLabel, ClaimCell, OutcomeCell, PairCell, SecondLookCell, VerdictCell } from './case-cells'
import type { CaseRow } from './case-rows'

registerGridModules()

type Entry = SectionEntry<CaseRow>
const { SectionsProvider, OpenRowCell, FullWidthRow, rowCell, rowValue } = createSections<CaseRow>()
const CONTROLS = ['open']
// What a spreadsheet gets: every column with words in it, the group first.
const EXPORTED = ['group', 'pair', 'expected', 'actual', 'model', 'secondLook', 'alignment', 'verdict']

const Pair = rowCell(PairCell)
const Claim = rowCell(ClaimCell)
const SecondLook = rowCell(SecondLookCell)
const Alignment = rowCell(AlignmentCell)
const VerdictOf = rowCell(VerdictCell)

export type CaseGridProps = {
  rows: readonly CaseRow[]
  // Grouped by kind when more than one kind is shown.
  grouped: boolean
  // A pair's photographs and what each look said, drawn under its row when it is opened.
  renderDetail: (row: CaseRow, heading: DetailHeading) => ReactNode
}

// The order the results sort in: what went wrong first.
const VERDICT_ORDER: Readonly<Record<CaseRow['verdict'], number>> = { fail: 0, person: 1, pass: 2 }
const VERDICTS = Object.keys(VERDICT_ORDER) as CaseRow['verdict'][]
type ResultFilter = CaseRow['verdict'] | 'all'
const isResultFilter = (value: string): value is ResultFilter => value === 'all' || VERDICTS.some((verdict) => verdict === value)

// A column's values in words, for the spreadsheet. AG Grid gives the formatter the column's value.
function wordsFor<Value>(format: (value: Value) => string): Pick<ColDef<Entry, Value>, 'valueFormatter'> {
  return { valueFormatter: ({ value }) => (value === null || value === undefined ? '' : format(value)) }
}

const idOf = (row: CaseRow) => row.id
const groupOf = (row: CaseRow) => row.group
const getRowHeight = ({ data }: RowHeightParams<Entry>) => sectionRowHeight(data, 52)
const renderGroup = (group: string, rows: readonly CaseRow[]) => <CaseGroupLabel group={group} rows={rows} />

// Every pair of the accepted run as a row: what it should have ended in, what it did, what the comparison claimed and
// how sure it was, what the second look said, how well the photographs lined up, and whether it was right. The pairs
// can be narrowed to one result, and each column says its values in words, which the spreadsheet holds.
export function CaseGrid({ rows, grouped, renderDetail }: CaseGridProps) {
  const t = useTranslations('openScorecard')
  const popupParent = usePopupParent()
  const levels = useTranslations('scorecard.levels')
  const [api, setApi] = useState<GridApi<Entry> | null>(null)
  const [result, setResult] = useState<ResultFilter>('all')
  const shown = useMemo(() => (result === 'all' ? rows : rows.filter((row) => row.verdict === result)), [rows, result])
  const { entries, openIds, toggle, focusOnOpen, grid } = useSections(shown, idOf, grouped ? groupOf : undefined, CONTROLS)

  const columns = useMemo<ColDef<Entry>[]>(() => [
    { colId: 'group', headerName: t('columns.group'), valueGetter: rowValue((row) => row.group), ...wordsFor((group: CaseRow['group']) => t(`groups.${group}`)), hide: true },
    { colId: 'open', headerName: t('columns.open'), cellRenderer: OpenRowCell, ...CONTROL_COLUMN },
    { colId: 'pair', headerName: t('columns.pair'), cellRenderer: Pair, valueGetter: rowValue((row) => row.id), flex: 2, minWidth: 180 },
    { colId: 'expected', headerName: t('columns.expected'), valueGetter: rowValue((row) => row.expected), cellRenderer: OutcomeCell, ...wordsFor((outcome: CaseRow['expected']) => t(`outcomes.${outcome}`)), flex: 1, minWidth: 116 },
    { colId: 'actual', headerName: t('columns.actual'), valueGetter: rowValue((row) => row.actual), cellRenderer: OutcomeCell, ...wordsFor((outcome: CaseRow['actual']) => t(`outcomes.${outcome}`)), flex: 1, minWidth: 116 },
    {
      colId: 'model',
      headerName: t('columns.model'),
      cellRenderer: Claim,
      valueGetter: rowValue((row) => row.lead?.confidence ?? -1),
      valueFormatter: ({ data }) => (data?.kind !== 'row' ? '' : data.row.lead === null || data.row.level === null ? t('noClaim') : t('claimed', { class: t(`classes.${data.row.lead.class}`), level: levels(data.row.level) })),
      flex: 2,
      minWidth: 170,
    },
    { colId: 'secondLook', headerName: t('columns.secondLook'), valueGetter: rowValue((row) => row.secondLook), cellRenderer: SecondLook, ...wordsFor((answer: CaseRow['secondLook']) => t(`secondLook.${answer}`)), sortable: false, flex: 1, minWidth: 132 },
    { colId: 'alignment', headerName: t('columns.alignment'), cellRenderer: Alignment, valueGetter: rowValue((row) => row.alignment ?? -1), valueFormatter: ({ data }) => (data?.kind !== 'row' ? '' : data.row.alignment === null ? t('noAlignment') : t('alignment', { percent: Math.round(data.row.alignment * 100) })), width: 84, minWidth: 84, type: 'rightAligned' },
    {
      colId: 'verdict',
      headerName: t('columns.verdict'),
      cellRenderer: VerdictOf,
      valueGetter: rowValue((row) => VERDICT_ORDER[row.verdict]),
      ...wordsFor((order: number) => t(`verdicts.${VERDICTS.find((verdict) => VERDICT_ORDER[verdict] === order) ?? 'pass'}`)),
      flex: 1,
      minWidth: 192,
    },
  ], [t, levels])

  const onGridReady = useCallback((event: GridReadyEvent<Entry>) => { setApi(event.api) }, [])
  // The pairs shown, every cell as its column words it, for anyone to check in a spreadsheet of their own.
  const download = () => { if (api !== null) downloadRows(api, 'hold-gate-pairs.csv', EXPORTED) }

  const sections = useMemo(
    () => ({ openIds, toggle, focusOnOpen, idOf, nameOf: (row: CaseRow) => t('detail.heading', { id: row.id }), toggleLabel: (row: CaseRow, open: boolean) => t(open ? 'closePair' : 'openPair', { id: row.id }), renderDetail, renderGroup }),
    [openIds, toggle, focusOnOpen, t, renderDetail],
  )
  return (
    <SectionsProvider value={sections}>
      <div className="grid min-w-0 gap-3">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="pair-result">{t('resultFilter.label')}</Label>
            <Select id="pair-result" className="w-auto" value={result} onChange={(event) => { if (isResultFilter(event.target.value)) setResult(event.target.value) }}>
              <option value="all">{t('resultFilter.all')}</option>
              {VERDICTS.map((verdict) => (
                <option key={verdict} value={verdict}>
                  {t(`verdicts.${verdict}`)}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="outline" className="min-h-12" disabled={api === null} onClick={download}>
            <Download aria-hidden="true" />
            {t('download')}
          </Button>
        </div>
        <div className="hold-grid min-w-0" role="region" aria-label={t('grid')}>
          <AgGridReact<Entry>
            theme={holdGridTheme}
            popupParent={popupParent}
            rowData={entries}
            columnDefs={columns}
            {...grid}
            fullWidthCellRenderer={FullWidthRow}
            rowHeight={64}
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
  )
}
