import type { GridApi, IRowNode } from 'ag-grid-community'
import type { SectionEntry } from './sections'

// The grid's rows as a file any spreadsheet opens: the columns named, every cell as its column words it, and neither a
// group's heading nor an opened detail.
export function downloadRows<Row>(api: GridApi<SectionEntry<Row>>, fileName: string, columnKeys: readonly string[]): void {
  api.exportDataAsCsv({ fileName, columnKeys: [...columnKeys], allColumns: true, shouldRowBeSkipped: ({ node }: { node: IRowNode<SectionEntry<Row>> }) => node.data?.kind !== 'row', processCellCallback: ({ value, formatValue }) => formatValue(value) })
}
