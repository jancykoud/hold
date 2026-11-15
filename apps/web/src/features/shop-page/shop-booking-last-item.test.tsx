import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithIntl } from '@/test/render'
import { ShopPageScreen } from './shop-page-screen'
import type { ShopPageScreenProps } from './shop-page-screen'

// Booking the last free item of a kind on the shop's own page, with nobody signed in. The booking takes the item, so
// the page is drawn again with nothing free while the booking's answer is still on its way; the renter must reach
// their link all the same, where they read the terms and pay the fee.

const LINK = 'https://hold.test/r/renter-token'
let answer: (result: unknown) => void = () => undefined
const bookOnShopPage = vi.fn(() => new Promise((resolve) => { answer = resolve }))
vi.mock('./actions', () => ({ bookOnShopPage: (...args: unknown[]) => bookOnShopPage(...(args as [])) }))

const props = (available: number): ShopPageScreenProps => ({
  shop: { slug: 'porto-cars', name: 'Porto Cars', currency: 'EUR' },
  open: true,
  period: { from: '2026-11-16T10:00', to: '2026-11-17T10:00', days: 1, invalid: false, period: { startsAt: new Date('2026-11-16T10:00:00Z'), endsAt: new Date('2026-11-17T10:00:00Z') } },
  types: [{ id: 'type-car', name: 'Compact car', category: 'car', currency: 'EUR', dayRateCents: 60_00, holdCents: 1200_00, available }],
  prices: [{ description: 'Scratch through the paint', category: 'damage', amountCents: 180_00 }],
  wearPolicy: 'Stone chips smaller than a coin are ordinary wear.',
})

afterEach(() => { vi.unstubAllGlobals() })

describe('booking the last free item on a shop’s own page', () => {
  it('takes the renter to their link, though the page was drawn again with nothing left to book', async () => {
    const assign = vi.fn()
    // The page's address, of which the form uses one thing: going to the renter's link.
    vi.stubGlobal('location', { assign })
    const { rerender } = renderWithIntl(<ShopPageScreen {...props(1)} />)
    await userEvent.click(screen.getByRole('button', { name: 'One more Compact car' }))
    await userEvent.click(screen.getByRole('button', { name: 'Book and pay the fee' }))
    await waitFor(() => { expect(bookOnShopPage).toHaveBeenCalled() })
    // The booking is made on the server, which draws the page again: the car is taken, so none is free.
    rerender(<ShopPageScreen {...props(0)} />)
    // The renter's own booking is under way: the page does not tell them nothing is free.
    expect(screen.queryByText('Nothing is free for these dates. Try other dates.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Booking…' })).toBeDisabled()
    answer({ ok: true, value: { url: LINK } })
    await waitFor(() => { expect(assign).toHaveBeenCalledWith(LINK) })
  })

  it('still says nothing is free, and offers nothing to book, when nothing was free to begin with', () => {
    renderWithIntl(<ShopPageScreen {...props(0)} />)
    expect(screen.getByText('Nothing is free for these dates. Try other dates.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Book and pay the fee' })).not.toBeInTheDocument()
  })
})
