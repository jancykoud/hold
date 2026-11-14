import { describe, expect, it } from 'vitest'
import { clipboardCells } from './clipboard-cells'

describe('cells copied from a spreadsheet', () => {
  it('are read row by row and cell by cell, as the spreadsheet put them on the clipboard', () => {
    expect(clipboardCells('Lost lock\t45\nBent wheel\tDamage\t€90')).toEqual([['Lost lock', '45'], ['Bent wheel', 'Damage', '€90']])
  })

  it('are read whichever line ending the spreadsheet used, without the empty line it adds at the end', () => {
    expect(clipboardCells('Lost lock\t45\r\nBent wheel\t90\r\n')).toEqual([['Lost lock', '45'], ['Bent wheel', '90']])
  })

  it('keep an empty cell and an empty row in the middle, so each cell lands where it was', () => {
    expect(clipboardCells('a\t\tc\n\nd')).toEqual([['a', '', 'c'], [''], ['d']])
  })

  it('are none when nothing was copied', () => {
    expect(clipboardCells('')).toEqual([])
  })
})
