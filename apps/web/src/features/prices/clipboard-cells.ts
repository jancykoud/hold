// The cells a spreadsheet puts on the clipboard as text: a row to a line, a tab between cells. A spreadsheet ends the
// last row with a line ending of its own, which is not a row.
export function clipboardCells(text: string): string[][] {
  if (text === '') return []
  const lines = text.split(/\r\n|\n|\r/)
  if (lines.at(-1) === '') lines.pop()
  return lines.map((line) => line.split('\t'))
}
