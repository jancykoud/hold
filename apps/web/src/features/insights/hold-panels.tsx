import { useTranslations } from 'next-intl'
import { Bar } from './bar'
import type { InsightsFigures } from './insights-figures'
import type { LifeSegment, WaterfallStep } from './widget-shapes'

// Hold's tokens for each part of a bar; the words beside each bar say the same, so no meaning rests on colour.
const SEGMENT_COLOURS: Readonly<Record<LifeSegment['kind'], string>> = { assured: 'var(--success)', valid: 'var(--muted-foreground)', ending: 'var(--primary)' }
const STEP_COLOURS: Readonly<Record<WaterfallStep['kind'], string>> = { reserved: 'var(--foreground)', captured: 'var(--primary)', released: 'var(--success)', held: 'var(--muted-foreground)' }

type Money = (cents: number) => string

// Every hold PayPal holds now on its 29-day line: assured, valid and ending, with today marked.
export function HoldLives({ lives, leftOut, money, empty }: { lives: InsightsFigures['lives']; leftOut: number; money: Money; empty: string }) {
  const t = useTranslations('insights')
  if (lives.length === 0) return <p className="px-4 py-4 text-muted-foreground md:px-5">{empty}</p>
  return (
    <div className="grid gap-4 px-4 py-4 md:px-5">
      <ul className="grid gap-4">
        {lives.map((life) => (
          <li key={life.rentalId} className="grid gap-1.5">
            <span className="figures text-sm">{t('custom.lifeLine', { day: life.day, days: life.days, standing: life.standing, amount: money(life.reservedCents) })}</span>
            <Bar parts={life.shape.segments.map((segment) => ({ from: segment.from, to: segment.to, colour: SEGMENT_COLOURS[segment.kind] }))} marker={life.shape.today} />
          </li>
        ))}
      </ul>
      {leftOut === 0 ? null : <p className="text-sm text-muted-foreground">{t('livesLeftOut', { count: leftOut })}</p>}
    </div>
  )
}

// What was reserved, stepping down by what was captured and what was released to what is still held, and whether
// captured plus released stayed within what was reserved.
export function SettlementWaterfall({ waterfall, money, empty }: { waterfall: InsightsFigures['waterfall']; money: Money; empty: string }) {
  const t = useTranslations('insights')
  if (waterfall.steps[0]?.cents === 0) return <p className="px-4 py-4 text-muted-foreground md:px-5">{empty}</p>
  return (
    <div className="grid gap-4 px-4 py-4 md:px-5">
      <ul className="grid gap-4">
        {waterfall.steps.map((step) => (
          <li key={step.kind} className="grid gap-1.5">
            <span className="flex flex-wrap justify-between gap-x-3 text-sm">
              <span>{t(`custom.steps.${step.kind}`)}</span>
              <span className="figures font-semibold">{money(step.cents)}</span>
            </span>
            <Bar parts={[{ from: step.from, to: step.to, colour: STEP_COLOURS[step.kind] }]} />
          </li>
        ))}
      </ul>
      <p className={waterfall.withinHold ? 'text-sm font-semibold' : 'text-sm font-semibold text-destructive'}>{t(waterfall.withinHold ? 'custom.withinHold' : 'custom.beyondHold')}</p>
    </div>
  )
}
