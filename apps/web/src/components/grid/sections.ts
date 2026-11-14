// A grid whose rows sit in groups under headings and open in place, on AG Grid Community, which has neither row
// grouping nor master-detail: the headings and the opened details are rows of their own, each drawn across the whole
// grid, and plain code puts them in place. The decision board, the money log and the open scorecard are built on it.

export type SectionEntry<Row> =
  // order: where the group comes among the groups, which a sorted column must not change.
  | { readonly kind: 'group'; readonly id: string; readonly group: string; readonly order: number; readonly rows: readonly Row[] }
  | { readonly kind: 'row'; readonly id: string; readonly group: string | null; readonly row: Row }
  | { readonly kind: 'detail'; readonly id: string; readonly group: string | null; readonly row: Row }

export type SectionOptions<Row> = {
  readonly idOf: (row: Row) => string
  // Left out, the rows are not grouped.
  readonly groupOf?: (row: Row) => string
  readonly openIds: ReadonlySet<string>
}

export const groupEntryId = (group: string) => `group:${group}`
export const detailEntryId = (id: string) => `detail:${id}`

// The grid's rows: each group's heading, its rows in the order given, and under each opened row its detail. Groups come
// in the order their first row does.
export function sectionEntries<Row>(rows: readonly Row[], { idOf, groupOf, openIds }: SectionOptions<Row>): readonly SectionEntry<Row>[] {
  const withDetail = (row: Row, group: string | null): SectionEntry<Row>[] => {
    const id = idOf(row)
    return [{ kind: 'row', id, group, row }, ...(openIds.has(id) ? [{ kind: 'detail' as const, id: detailEntryId(id), group, row }] : [])]
  }
  if (groupOf === undefined) return rows.flatMap((row) => withDetail(row, null))
  const groups = new Map<string, Row[]>()
  for (const row of rows) {
    const group = groupOf(row)
    groups.set(group, [...(groups.get(group) ?? []), row])
  }
  return [...groups].flatMap(([group, members], order) => [{ kind: 'group' as const, id: groupEntryId(group), group, order, rows: members }, ...members.flatMap((row) => withDetail(row, group))])
}

// Puts the grid's rows back in sections after it sorted them by a column, in place: a sort moves the rows inside their
// group and never a heading or a detail. Groups keep the order their headings hold.
export function arrangeSections<Row>(nodes: { readonly data: SectionEntry<Row> | undefined }[]): void {
  const headings = new Map<string | null, (typeof nodes)[number]>()
  const rows = new Map<string | null, (typeof nodes)[number][]>()
  const details = new Map<string, (typeof nodes)[number]>()
  const empty: typeof nodes = []
  for (const node of nodes) {
    const entry = node.data
    if (entry === undefined) empty.push(node)
    else if (entry.kind === 'group') headings.set(entry.group, node)
    else if (entry.kind === 'detail') details.set(entry.id, node)
    else rows.set(entry.group, [...(rows.get(entry.group) ?? []), node])
  }
  const order: (string | null)[] = [...headings.values()].flatMap((node) => (node.data?.kind === 'group' ? [node.data] : [])).sort((first, second) => first.order - second.order).map((heading) => heading.group)
  for (const group of rows.keys()) if (!order.includes(group)) order.push(group)
  const arranged = order.flatMap((group) => {
    const heading = headings.get(group)
    const members = (rows.get(group) ?? []).flatMap((node) => {
      const detail = node.data === undefined ? undefined : details.get(detailEntryId(node.data.id))
      return detail === undefined ? [node] : [node, detail]
    })
    return heading === undefined ? members : [heading, ...members]
  })
  nodes.splice(0, nodes.length, ...arranged, ...empty)
}
