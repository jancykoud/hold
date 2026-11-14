import { describe, expect, it } from 'vitest'
import { arrangeSections, sectionEntries } from './sections'

type Line = { readonly id: string; readonly kind: string }
const lines: readonly Line[] = [
  { id: 'a', kind: 'claim' },
  { id: 'b', kind: 'release' },
  { id: 'c', kind: 'claim' },
]
const idOf = (line: Line) => line.id
const groupOf = (line: Line) => line.kind
const shape = (entries: readonly { readonly id: string }[]) => entries.map((entry) => entry.id)

describe('the rows of a grid in sections', () => {
  it('are the rows alone when nothing groups them and none is open', () => {
    expect(sectionEntries(lines, { idOf, openIds: new Set() })).toEqual(lines.map((row) => ({ kind: 'row', id: row.id, group: null, row })))
  })

  it('come under a heading for each group, the groups in the order their first row comes', () => {
    const entries = sectionEntries(lines, { idOf, groupOf, openIds: new Set() })
    expect(shape(entries)).toEqual(['group:claim', 'a', 'c', 'group:release', 'b'])
    expect(entries[0]).toEqual({ kind: 'group', id: 'group:claim', group: 'claim', order: 0, rows: [lines[0], lines[2]] })
  })

  it('put an opened row’s detail straight under it', () => {
    const entries = sectionEntries(lines, { idOf, groupOf, openIds: new Set(['c', 'gone']) })
    expect(shape(entries)).toEqual(['group:claim', 'a', 'c', 'detail:c', 'group:release', 'b'])
    expect(entries[3]).toEqual({ kind: 'detail', id: 'detail:c', group: 'claim', row: lines[2] })
  })

  it('keep each heading over its rows and each detail under its row, whatever order a sorted column gave the rows', () => {
    const entries = sectionEntries(lines, { idOf, groupOf, openIds: new Set(['a']) })
    const byId = new Map(entries.map((entry) => [entry.id, { data: entry }]))
    const sorted = ['detail:a', 'b', 'c', 'group:release', 'a', 'group:claim'].flatMap((id) => byId.get(id) ?? [])
    arrangeSections(sorted)
    expect(sorted.map((node) => node.data.id)).toEqual(['group:claim', 'c', 'a', 'detail:a', 'group:release', 'b'])
  })

  it('leave rows with no data, which the grid may hold for a moment, at the end', () => {
    const nodes: { data: ReturnType<typeof sectionEntries<Line>>[number] | undefined }[] = [{ data: undefined }, { data: { kind: 'row', id: 'a', group: null, row: { id: 'a', kind: 'claim' } } }]
    arrangeSections(nodes)
    expect(nodes.map((node) => node.data?.id)).toEqual(['a', undefined])
  })
})
