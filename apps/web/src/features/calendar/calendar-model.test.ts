import type { CalendarBooking, ShopCalendar } from '@hold/db'
import { describe, expect, it } from 'vitest'
import { barSpan, calendarModel, openingDate, timelineDays, STANDING_COLORS, standingOf } from './calendar-model'

const booking = (overrides: Partial<CalendarBooking>): CalendarBooking => ({
  rentalId: 'rental-1',
  itemId: 'item-1',
  startsAt: new Date('2026-10-14T09:00:00Z'),
  endsAt: new Date('2026-10-16T17:00:00Z'),
  renterName: 'Priya Natarajan',
  rentalState: 'out',
  holdState: 'placed',
  simulated: false,
  ...overrides,
})

describe('where a rental on the calendar stands', () => {
  it('is held while PayPal holds the deposit for an item that is out', () => {
    expect(standingOf(booking({}))).toBe('held')
    expect(standingOf(booking({ rentalState: 'ready', holdState: 'placed' }))).toBe('held')
  })

  it('waits on the renter while the fee or the hold is still to approve', () => {
    for (const [rentalState, holdState] of [['pending_payment', null], ['booked', null], ['awaiting_hold', 'requested']] as const) {
      expect(standingOf(booking({ rentalState, holdState }))).toBe('awaiting')
    }
  })

  it('is late when the item is overdue, being settled once it is back, and done once closed', () => {
    expect(standingOf(booking({ rentalState: 'overdue' }))).toBe('late')
    for (const rentalState of ['dropped_off', 'returned', 'inspecting', 'settling'] as const) expect(standingOf(booking({ rentalState }))).toBe('settling')
    expect(standingOf(booking({ rentalState: 'closed', holdState: 'released' }))).toBe('done')
  })
})

describe('the calendar the scheduler draws', () => {
  it('makes each item a row and each booking a bar on its item, named for the renter and linked to the rental', () => {
    const calendar: ShopCalendar = {
      items: [{ id: 'item-1', label: 'City bike 1', typeName: 'City bike', simulated: false }],
      bookings: [booking({}), booking({ rentalId: 'rental-2', renterName: null, rentalState: 'overdue', simulated: true })],
    }
    const model = calendarModel(calendar, 'Renter not known yet')
    expect(model.resources).toEqual([{ id: 'item-1', name: 'City bike 1', type: 'City bike' }])
    expect(model.events).toEqual([
      { id: 'rental-1:item-1', resourceId: 'item-1', rentalId: 'rental-1', startDate: '2026-10-14T09:00:00.000Z', endDate: '2026-10-16T17:00:00.000Z', name: 'Priya Natarajan', standing: 'held', simulated: false, eventColor: STANDING_COLORS.held },
      { id: 'rental-2:item-1', resourceId: 'item-1', rentalId: 'rental-2', startDate: '2026-10-14T09:00:00.000Z', endDate: '2026-10-16T17:00:00.000Z', name: 'Renter not known yet', standing: 'late', simulated: true, eventColor: STANDING_COLORS.late },
    ])
  })
})

describe('where the calendar opens', () => {
  const now = new Date('2026-10-28T10:00:00Z')
  const windowFrom = new Date('2026-10-21T00:00:00Z')
  const bar = (startDate: string, endDate: string) => ({ startDate, endDate })

  it('opens where the earliest rental still under way began, so each bike out today shows whole', () => {
    const events = [bar('2026-10-26T09:00:00Z', '2026-10-29T17:00:00Z'), bar('2026-10-24T09:00:00Z', '2026-10-28T17:00:00Z'), bar('2026-11-02T09:00:00Z', '2026-11-05T09:00:00Z')]
    expect(openingDate(events, now, windowFrom)).toEqual(new Date('2026-10-24T09:00:00Z'))
  })

  it('opens on now when nothing is under way, as a rental that ended or has yet to start does not move it', () => {
    expect(openingDate([bar('2026-10-22T09:00:00Z', '2026-10-25T17:00:00Z'), bar('2026-11-02T09:00:00Z', '2026-11-05T09:00:00Z')], now, windowFrom)).toEqual(now)
    expect(openingDate([], now, windowFrom)).toEqual(now)
  })

  it('never opens before the calendar’s first day', () => {
    expect(openingDate([bar('2026-10-10T09:00:00Z', '2026-10-30T17:00:00Z')], now, windowFrom)).toEqual(windowFrom)
  })
})

describe('the days of the timeline', () => {
  const shown = { from: new Date('2026-10-21T00:00:00Z'), to: new Date('2026-10-24T00:00:00Z') }

  it('are one for each day shown, from the first', () => {
    expect(timelineDays(shown)).toEqual([new Date('2026-10-21T00:00:00Z'), new Date('2026-10-22T00:00:00Z'), new Date('2026-10-23T00:00:00Z')])
  })

  it('include a last day that is only partly shown', () => {
    expect(timelineDays({ from: shown.from, to: new Date('2026-10-22T06:00:00Z') })).toHaveLength(2)
  })
})

describe('a rental’s bar on the timeline', () => {
  const shown = { from: new Date('2026-10-21T00:00:00Z'), to: new Date('2026-10-28T00:00:00Z') }
  const bar = (startDate: string, endDate: string) => ({ startDate, endDate })

  it('starts where the rental does and is as long as it lasts, in days', () => {
    expect(barSpan(bar('2026-10-22T12:00:00Z', '2026-10-24T00:00:00Z'), shown)).toEqual({ offsetDays: 1.5, lengthDays: 1.5 })
  })

  it('is cut at the edges of the days shown', () => {
    expect(barSpan(bar('2026-10-19T00:00:00Z', '2026-10-22T00:00:00Z'), shown)).toEqual({ offsetDays: 0, lengthDays: 1 })
    expect(barSpan(bar('2026-10-27T00:00:00Z', '2026-11-02T00:00:00Z'), shown)).toEqual({ offsetDays: 6, lengthDays: 1 })
  })

  it('is not drawn for a rental wholly outside the days shown', () => {
    expect(barSpan(bar('2026-10-10T00:00:00Z', '2026-10-21T00:00:00Z'), shown)).toBeNull()
    expect(barSpan(bar('2026-10-28T00:00:00Z', '2026-10-30T00:00:00Z'), shown)).toBeNull()
  })
})
