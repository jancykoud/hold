import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithIntl } from '@/test/render'
import { NewRentalScreen } from './new-rental-screen'
import type { NewRentalScreenProps } from './new-rental-screen'

// Booking the last free item of a kind. The booking takes the item, so the page is drawn again with nothing free
// while the booking's answer is still on its way; the rental must open all the same.

const RENTAL = '00000000-0000-4000-8000-0000000000a3'
let answer: (result: unknown) => void = () => undefined
const bookRental = vi.fn(() => new Promise((resolve) => { answer = resolve }))
const push = vi.fn()
vi.mock('./actions', () => ({ bookRental: (...args: unknown[]) => bookRental(...(args as [])) }))
vi.mock('@/i18n/navigation', async (original) => ({ ...(await original<object>()), useRouter: () => ({ push, refresh: vi.fn() }) }))

const car = (available: number) => [{ id: 'type-car', name: 'Compact car', category: 'car' as const, currency: 'EUR', dayRateCents: 60_00, holdCents: 1200_00, available }]
const props = (available: number): NewRentalScreenProps => ({
  shopName: 'Porto Cars',
  currency: 'EUR',
  period: { from: '2026-11-16T10:00', to: '2026-11-17T10:00', days: 1, invalid: false, period: { startsAt: new Date('2026-11-16T10:00:00Z'), endsAt: new Date('2026-11-17T10:00:00Z') } },
  types: car(available),
  ready: 'ready',
})

describe('booking the last free item', () => {
  it('opens the rental, though the page was drawn again with nothing left to book', async () => {
    const { rerender } = renderWithIntl(<NewRentalScreen {...props(1)} />)
    await userEvent.click(screen.getByRole('button', { name: 'One more Compact car' }))
    await userEvent.click(screen.getByRole('button', { name: 'Book' }))
    await waitFor(() => { expect(bookRental).toHaveBeenCalled() })
    // The booking is made on the server, which draws the page again: the car is taken, so none is free.
    rerender(<NewRentalScreen {...props(0)} />)
    answer({ ok: true, value: { rentalId: RENTAL, sent: 'email' } })
    await waitFor(() => { expect(push).toHaveBeenCalledWith(`/shop/rentals/${RENTAL}`) })
  })

  it('still says nothing is free, and offers nothing to book, when nothing was free to begin with', () => {
    renderWithIntl(<NewRentalScreen {...props(0)} />)
    expect(screen.getByText('Nothing is free for these dates. Try other dates.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Book' })).not.toBeInTheDocument()
  })
})
