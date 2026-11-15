import { createMemoryCredentialStore } from '@hold/paypal'
import { describe, expect, it } from 'vitest'
import { checkoutFrom } from './paypal-checkout'

// PayPal's own button needs the shop's public client ID, and nothing else of its credentials.
describe('the PayPal app a renter’s page names', () => {
  it('is the shop’s client ID, never its secret, when Hold works with the real PayPal', async () => {
    const store = createMemoryCredentialStore()
    const reference = await store.save('shop-1', 'sandbox', { clientId: 'shop-client-id', clientSecret: 'shop-secret' })
    const checkout = await checkoutFrom({ services: 'aws', store, paypalMode: 'sandbox' }, reference)
    expect(checkout).toEqual({ clientId: 'shop-client-id', environment: 'sandbox' })
    expect(JSON.stringify(checkout)).not.toContain('shop-secret')
  })

  it('names PayPal’s live environment for a shop connected with a live account, so the button loads PayPal’s live script', async () => {
    const store = createMemoryCredentialStore()
    const reference = await store.save('shop-1', 'live', { clientId: 'live-client-id', clientSecret: 'live-secret' })
    expect(await checkoutFrom({ services: 'aws', store, paypalMode: 'live' }, reference)).toEqual({ clientId: 'live-client-id', environment: 'live' })
  })

  it('is not named where PayPal is simulated or the shop has none, so the page sends the renter to PayPal’s own page', async () => {
    const store = createMemoryCredentialStore()
    const reference = await store.save('shop-1', 'sandbox', { clientId: 'shop-client-id', clientSecret: 'shop-secret' })
    expect(await checkoutFrom({ services: 'fake', store, paypalMode: 'sandbox' }, reference)).toBeUndefined()
    expect(await checkoutFrom({ services: 'aws', store, paypalMode: 'sandbox' }, undefined)).toBeUndefined()
    expect(await checkoutFrom({ services: 'aws', store, paypalMode: 'sandbox' }, 'hold/paypal/shops/unknown/sandbox')).toBeUndefined()
  })
})
