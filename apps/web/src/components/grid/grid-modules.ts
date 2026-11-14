import { CellStyleModule, ClientSideRowModelApiModule, ClientSideRowModelModule, CsvExportModule, ModuleRegistry, RowApiModule, RowDragModule, RowSelectionModule, SelectEditorModule, TextEditorModule, ValidationModule } from 'ag-grid-community'

// The AG Grid Community modules Hold's grids share, registered once for all of them: client-side rows, choosing rows,
// the row API, telling the grid a row's height changed, cell styles, the download for a spreadsheet, and for the price list editor, editing text and a choice
// in a cell and dragging rows into order. Hold uses no AG Grid Enterprise module, so no grid needs a licence key. The
// validation module explains a misconfiguration while developing and is left out of a build.
export function registerGridModules(): void {
  ModuleRegistry.registerModules([ClientSideRowModelModule, ClientSideRowModelApiModule, CsvExportModule, RowSelectionModule, RowApiModule, CellStyleModule, TextEditorModule, SelectEditorModule, RowDragModule, ...(process.env.NODE_ENV === 'production' ? [] : [ValidationModule])])
}
