import type { ShopToday } from '@hold/db'
import { CalendarRange, Camera, MessageSquareWarning, Timer } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Panel } from '@/components/ui/panel'
import type { ShopClock } from '@/hooks/use-shop-format'
import { useShopFormat } from '@/hooks/use-shop-format'

const figures = ['fees', 'released', 'claimed', 'recovered'] as const

// Minutes and seconds, as a counter reads a stopwatch.
const clockTime = (seconds: number) => `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`
// Hours and minutes, for a wait that runs longer than a stopwatch: "35 min", "2 h 05 min".
const spanTime = (seconds: number) => {
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${String(minutes)} min` : `${String(Math.floor(minutes / 60))} h ${String(minutes % 60).padStart(2, '0')} min`
}

// The month so far, from the money log and the claims; how long the counter takes; and what an inspection costs to
// take and to settle: the photographs taken again and the claims contested. Each is given with its count.
export function MonthPanel({ month, routine, measures, now, clock }: { month: ShopToday['month']; routine: ShopToday['routine']; measures: ShopToday['measures']; now: Date; clock: ShopClock }) {
  const { retakes, contests } = measures
  const t = useTranslations('today.month')
  const format = useShopFormat(clock)
  const cents = { fees: month.feesCents, released: month.releasedCents, claimed: month.claimedCents, recovered: month.recoveredCents }
  const title = t('title', { month: format.month(now) })

  return (
    <Panel title={title.charAt(0).toUpperCase() + title.slice(1)} icon={CalendarRange}>
      <dl className="grid grid-cols-2 gap-2 p-3 md:p-4">
        {figures.map((key) => (
          <div key={key} className="min-w-0 rounded-xl bg-muted/55 px-3.5 py-3">
            <dt className="text-[0.8125rem] text-muted-foreground wrap-long-words">{t(key)}</dt>
            <dd className="mt-1 text-xl font-extrabold tracking-tight tabular-nums wrap-long-words">{format.money(cents[key])}</dd>
          </div>
        ))}
      </dl>
      <ul className="grid gap-1.5 border-t border-border/70 px-4 py-3.5 text-[0.9375rem] md:px-5">
        {routine.handover.medianSeconds === null && routine.return.medianSeconds === null ? (
          <li className="flex gap-2 text-muted-foreground">
            <Timer aria-hidden="true" className="mt-1 size-4 shrink-0" />
            {t('routineNone')}
          </li>
        ) : (
          <>
            <li className="flex gap-2">
              <Timer aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
              {routine.handover.medianSeconds === null ? t('routineHandoverNone') : t('routineHandover', { time: clockTime(routine.handover.medianSeconds), count: routine.handover.count })}
            </li>
            <li className="flex gap-2">
              <Timer aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
              {routine.return.medianSeconds === null ? t('routineReturnNone') : t('routineReturn', { time: clockTime(routine.return.medianSeconds), count: routine.return.count })}
            </li>
          </>
        )}
        <li className={retakes.inspections === 0 ? 'flex gap-2 text-muted-foreground' : 'flex gap-2'}>
          <Camera aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
          {retakes.inspections === 0 ? t('retakesNone') : t('retakes', { retakes: retakes.retakes, inspections: retakes.inspections, withRetake: retakes.withRetake })}
        </li>
        <li className={contests.presented === 0 ? 'flex gap-2 text-muted-foreground' : 'flex gap-2'}>
          <MessageSquareWarning aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
          {contests.presented === 0 ? t('contestsNone') : t('contests', { contested: contests.contested, presented: contests.presented })}
        </li>
        {contests.decision.medianSeconds === null ? null : (
          <li className="flex gap-2">
            <Timer aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
            {t('contestDecision', { time: spanTime(contests.decision.medianSeconds), count: contests.decision.count })}
          </li>
        )}
      </ul>
    </Panel>
  )
}
