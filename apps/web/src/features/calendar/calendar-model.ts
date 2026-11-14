import type { CalendarBooking, ShopCalendar } from '@hold/db'

// What the shop's calendar draws (extensions.md section 12.5): each item a row, each rental a bar on the items it took,
// marked by where its PayPal hold stands. The bar's words and its mark say the same, so colour is never alone.

export const STANDINGS = ['held', 'awaiting', 'late', 'settling', 'done'] as const
export type Standing = (typeof STANDINGS)[number]

// Each standing's colour, as the app's own tokens, for the bars and the legend alike, so both follow the light and dark
// themes. Every bar also says its standing in words.
export const STANDING_COLORS: Readonly<Record<Standing, string>> = { held: 'var(--success)', awaiting: 'var(--warning)', late: 'var(--destructive)', settling: 'var(--contrast)', done: 'var(--muted-foreground)' }

export function standingOf(booking: Pick<CalendarBooking, 'rentalState' | 'holdState'>): Standing {
  switch (booking.rentalState) {
    case 'overdue':
      return 'late'
    case 'dropped_off':
    case 'returned':
    case 'inspecting':
    case 'settling':
      return 'settling'
    case 'closed':
      return 'done'
    default:
      return booking.holdState === 'placed' ? 'held' : 'awaiting'
  }
}

export type CalendarResource = { readonly id: string; readonly name: string; readonly type: string }
export type CalendarEvent = {
  readonly id: string
  readonly resourceId: string
  readonly rentalId: string
  readonly startDate: string
  readonly endDate: string
  readonly name: string
  readonly standing: Standing
  readonly simulated: boolean
  readonly eventColor: string
}

export function calendarModel(calendar: ShopCalendar, unknownRenter: string): { readonly resources: readonly CalendarResource[]; readonly events: readonly CalendarEvent[] } {
  return {
    resources: calendar.items.map((item) => ({ id: item.id, name: item.label, type: item.typeName })),
    events: calendar.bookings.map((booking) => {
      const standing = standingOf(booking)
      return {
        id: `${booking.rentalId}:${booking.itemId}`,
        resourceId: booking.itemId,
        rentalId: booking.rentalId,
        startDate: booking.startsAt.toISOString(),
        endDate: booking.endsAt.toISOString(),
        name: booking.renterName ?? unknownRenter,
        standing,
        simulated: booking.simulated,
        eventColor: STANDING_COLORS[standing],
      }
    }),
  }
}

// Where the timeline opens: where the earliest rental still under way began, so each item out today shows its whole
// bar, or now when nothing is under way. Never before the calendar's first day.
export function openingDate(events: readonly Pick<CalendarEvent, 'startDate' | 'endDate'>[], now: Date, windowFrom: Date): Date {
  const underWay = events.map((event) => ({ start: new Date(event.startDate), end: new Date(event.endDate) })).filter(({ start, end }) => start <= now && end > now)
  const earliest = underWay.reduce((first, { start }) => (start < first ? start : first), now)
  return earliest < windowFrom ? windowFrom : earliest
}

const DAY_MS = 24 * 60 * 60 * 1000
type Shown = { readonly from: Date; readonly to: Date }

// The days the timeline shows, each by its start: one for every 24 hours from the first, the last one whole even when
// the days shown end inside it.
export function timelineDays(shown: Shown): readonly Date[] {
  const count = Math.max(0, Math.ceil((shown.to.getTime() - shown.from.getTime()) / DAY_MS))
  return Array.from({ length: count }, (_, day) => new Date(shown.from.getTime() + day * DAY_MS))
}

// Where a rental's bar sits among the days shown, in days from the first: cut at the edges, and none for a rental
// wholly outside them.
export function barSpan(event: Pick<CalendarEvent, 'startDate' | 'endDate'>, shown: Shown): { readonly offsetDays: number; readonly lengthDays: number } | null {
  const start = Math.max(new Date(event.startDate).getTime(), shown.from.getTime())
  const end = Math.min(new Date(event.endDate).getTime(), shown.to.getTime())
  if (end <= start) return null
  return { offsetDays: (start - shown.from.getTime()) / DAY_MS, lengthDays: (end - start) / DAY_MS }
}
