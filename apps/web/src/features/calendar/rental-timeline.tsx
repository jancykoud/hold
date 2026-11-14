'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import type { ShopClock } from '@/hooks/use-shop-format'
import { useShopFormat } from '@/hooks/use-shop-format'
import { Link } from '@/i18n/navigation'
import { rentalRoutes } from '@/lib/routes'
import { barSpan, openingDate, timelineDays } from './calendar-model'
import type { CalendarEvent, CalendarResource, Standing } from './calendar-model'

export type RentalTimelineProps = {
  resources: readonly CalendarResource[]
  events: readonly CalendarEvent[]
  window: { readonly from: Date; readonly to: Date }
  clock: ShopClock
  standingText: Readonly<Record<Standing, string>>
}

// A day wide enough for a renter's name, the column of items beside the days, and a row tall enough for a bar a
// finger can press. In rem, so the timeline grows with the reader's text.
const DAY_REM = 8.25
const ITEMS_REM = 12.5
const rem = (days: number) => `${String(days * DAY_REM)}rem`

// The calendar as a timeline, drawn by Hold with no library: each item a row, each rental a bar on the days it
// takes, in its standing's colour and words. Read only: a bar is a link to its rental's page, where a booking is made,
// moved or ended and every rule is checked. The frame scrolls inside itself, so the page around it stays still, and it
// opens where the earliest rental still out began, with a line marking now.
export function RentalTimeline({ resources, events, window: shown, clock, standingText }: RentalTimelineProps) {
  const t = useTranslations('shop.calendar')
  const format = useShopFormat(clock)
  const frame = useRef<HTMLDivElement>(null)
  const days = timelineDays(shown)
  // Now is the reader's own moment, known only in the browser, so the page and the server draw the same first.
  const [nowDays, setNowDays] = useState<number | null>(null)
  useEffect(() => {
    const now = new Date()
    const offset = (moment: Date) => (moment.getTime() - shown.from.getTime()) / (24 * 60 * 60 * 1000)
    setNowDays(now >= shown.from && now < shown.to ? offset(now) : null)
    const element = frame.current
    if (element === null) return
    const opening = Math.floor(offset(openingDate(events, now, shown.from)))
    element.scrollLeft = opening * DAY_REM * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  }, [events, shown])
  return (
    <div ref={frame} className="max-h-[min(40rem,72dvh)] min-w-0 overflow-auto bg-card" tabIndex={0} role="region" aria-label={t('timeline')}>
      <div className="relative" style={{ width: `calc(${String(ITEMS_REM)}rem + ${rem(days.length)})` }}>
        <div aria-hidden="true" className="sticky top-0 z-20 flex border-b border-border/70 bg-card text-[0.8125rem] font-semibold text-muted-foreground">
          <span className="sticky left-0 z-10 shrink-0 border-r border-border/70 bg-card px-4 py-2.5" style={{ width: `${String(ITEMS_REM)}rem` }}>{t('item')}</span>
          {days.map((day) => (
            <span key={day.getTime()} className="figures shrink-0 border-r border-border/40 px-2.5 py-2.5" style={{ width: rem(1) }}>{format.weekday(day)}</span>
          ))}
        </div>
        <ul aria-label={t('timeline')}>
          {resources.map((item) => (
            <li key={item.id} className="flex border-b border-border/50 last:border-b-0">
              <h2 className="sticky left-0 z-10 grid min-h-16 shrink-0 content-center border-r border-border/70 bg-card px-4 py-2 leading-snug" style={{ width: `${String(ITEMS_REM)}rem` }}>
                <span className="truncate font-semibold">{item.name}</span>
                <span className="truncate text-sm font-normal text-muted-foreground">{item.type}</span>
              </h2>
              <ul className="relative min-h-16 flex-1 bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(8.25rem-1px),color-mix(in_oklab,var(--border)_40%,transparent)_calc(8.25rem-1px),color-mix(in_oklab,var(--border)_40%,transparent)_8.25rem)]">
                {events.filter((event) => event.resourceId === item.id).map((event) => {
                  const span = barSpan(event, shown)
                  return span === null ? null : (
                    <li key={event.id} className="absolute inset-y-2.5" style={{ left: rem(span.offsetDays), width: rem(span.lengthDays) }}>
                      <Link
                        href={rentalRoutes.rental(event.rentalId)}
                        data-rental-bar
                        aria-label={`${event.name}, ${standingText[event.standing]}, ${format.day(new Date(event.startDate))} – ${format.day(new Date(event.endDate))}`}
                        className="grid h-full min-h-11 min-w-11 content-center rounded-lg border border-l-4 px-2.5 leading-tight text-foreground transition-colors hover:brightness-95"
                        style={{ borderColor: event.eventColor, backgroundColor: `color-mix(in oklab, ${event.eventColor} 14%, var(--card))` }}
                      >
                        <span className="truncate text-sm font-semibold">{event.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{standingText[event.standing]}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
        {nowDays === null ? null : <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary" style={{ left: `calc(${String(ITEMS_REM)}rem + ${rem(nowDays)})` }} />}
      </div>
    </div>
  )
}
