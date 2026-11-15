import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { renderWithIntl } from '@/test/render'
import { PayPalStatus } from './paypal-status'

// The shell says on every page which PayPal the shop is connected to, so nobody takes a test for real money.
it('says whether the connected PayPal account is the sandbox or a live one', () => {
  const { unmount } = renderWithIntl(<PayPalStatus connected paypalMode="sandbox" />)
  expect(screen.getByText('PayPal connected · sandbox')).toBeInTheDocument()
  unmount()
  renderWithIntl(<PayPalStatus connected paypalMode="live" />)
  expect(screen.getByText('PayPal connected · live')).toBeInTheDocument()
})
