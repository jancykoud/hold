import { Bar } from './bar'

// Two figures side by side for each row, such as what went to the shop and back to renters each month: each figure in
// words with its amount, over a bar as long as its share of the largest figure shown.
export type BarPairRow = { readonly key: string; readonly label: string; readonly first: number; readonly second: number }

const FIRST = 'var(--primary)'
const SECOND = 'var(--success)'

export function BarPairs({ rows, firstLabel, secondLabel, money, empty }: { rows: readonly BarPairRow[]; firstLabel: string; secondLabel: string; money: (cents: number) => string; empty: string }) {
  if (rows.length === 0) return <p className="px-4 py-4 text-muted-foreground md:px-5">{empty}</p>
  const most = Math.max(1, ...rows.flatMap((row) => [row.first, row.second]))
  const figure = (label: string, cents: number, colour: string) => (
    <span className="grid gap-1">
      <span className="flex flex-wrap justify-between gap-x-3 text-sm">
        <span className="text-muted-foreground">{label}</span> <span className="figures font-semibold">{money(cents)}</span>
      </span>
      <Bar parts={[{ from: 0, to: cents / most, colour }]} />
    </span>
  )
  return (
    <ul className="grid gap-5 px-4 py-4 md:px-5">
      {rows.map((row) => (
        <li key={row.key} className="grid min-w-0 gap-2">
          <span className="font-semibold wrap-long-words">{row.label}</span>
          {figure(firstLabel, row.first, FIRST)}
          {figure(secondLabel, row.second, SECOND)}
        </li>
      ))}
    </ul>
  )
}
