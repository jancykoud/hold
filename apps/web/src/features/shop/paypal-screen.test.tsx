import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithIntl } from '@/test/render'
import { PayPalScreen } from './paypal-screen'

vi.mock('./actions', () => ({ connectPayPal: () => Promise.resolve(null), turnOnPayPalNotifications: () => Promise.resolve(null) }))

const gate = { needed: false, hasPasskey: true, email: 'ana@ribeira.example' }

describe('the PayPal page', () => {
  it('says PayPal tells Hold what happens to each payment', () => {
    renderWithIntl(<PayPalScreen shopName="Ribeira Bikes" connectedAt={new Date('2026-10-14T09:00:00Z')} notifications="on" isOwner gate={gate} />)
    expect(screen.getByText(/PayPal tells Hold/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Turn on notifications' })).not.toBeInTheDocument()
  })

  it('offers the owner to turn notifications on when PayPal does not send them yet', () => {
    renderWithIntl(<PayPalScreen shopName="Ribeira Bikes" connectedAt={new Date('2026-10-14T09:00:00Z')} notifications="off" isOwner gate={gate} />)
    expect(screen.getByText(/does not tell Hold yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Turn on notifications' })).toBeInTheDocument()
  })

  // A person must never take a test for real money, nor real money for a test.
  it('asks for a sandbox app where Hold runs in the sandbox, and for a live app where it moves real money', () => {
    const { unmount } = renderWithIntl(<PayPalScreen shopName="Ribeira Bikes" connectedAt={undefined} notifications="off" isOwner gate={gate} />)
    expect(screen.getByText('Connect a PayPal sandbox app')).toBeInTheDocument()
    expect(screen.getByText(/connects sandbox accounts only/)).toBeInTheDocument()
    unmount()
    renderWithIntl(<PayPalScreen shopName="Porto Cars" connectedAt={undefined} notifications="off" isOwner gate={gate} paypalMode="live" />)
    expect(screen.getByText('Connect your PayPal business account')).toBeInTheDocument()
    expect(screen.getByText(/moves real money/)).toBeInTheDocument()
    expect(screen.queryByText(/sandbox/i)).not.toBeInTheDocument()
  })

  // Every demo shop shares one sandbox app, which may not subscribe an address per shop (architecture.md section 20.3).
  it('says a demo shop learns each step by reading PayPal back, and offers no notifications to turn on', () => {
    renderWithIntl(<PayPalScreen shopName="Ribeira Bikes" connectedAt={new Date('2026-10-14T09:00:00Z')} notifications="demo" isOwner gate={gate} />)
    expect(screen.getByText(/shares one PayPal sandbox account with every other demo/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Turn on notifications' })).not.toBeInTheDocument()
  })

  it('says a demo shop hears PayPal through the shared app’s one address once it is subscribed', () => {
    renderWithIntl(<PayPalScreen shopName="Ribeira Bikes" connectedAt={new Date('2026-10-14T09:00:00Z')} notifications="demo_on" isOwner gate={gate} />)
    expect(screen.getByText(/PayPal sends that app’s events to one address/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Turn on notifications' })).not.toBeInTheDocument()
  })
})
