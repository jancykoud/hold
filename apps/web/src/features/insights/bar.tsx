// One bar of the insights dashboard: parts of a track, each from and to a fraction of it, in one of Hold's tokens, and
// a line marking today when given. A picture of figures written beside it, so it is not read aloud.
export type BarPart = { readonly from: number; readonly to: number; readonly colour: string }

const percent = (fraction: number) => `${String(Math.min(Math.max(fraction, 0), 1) * 100)}%`

export function Bar({ parts, marker }: { parts: readonly BarPart[]; marker?: number }) {
  return (
    <span aria-hidden="true" className="relative block h-2.5 w-full rounded-full bg-muted">
      {parts.map((part) => (
        <span key={`${String(part.from)}-${part.colour}`} className="absolute inset-y-0 rounded-full" style={{ left: percent(part.from), width: percent(part.to - part.from), backgroundColor: part.colour }} />
      ))}
      {marker === undefined ? null : <span className="absolute -inset-y-1 w-0.5 bg-foreground" style={{ left: percent(marker) }} />}
    </span>
  )
}
