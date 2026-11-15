// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { paypalSession } from './paypal-sdk'

afterEach(() => { document.head.querySelectorAll('script').forEach((script) => { script.remove() }) })

const callbacks = { onApprove: () => Promise.resolve(), onCancel: () => undefined, onError: () => undefined }
const scripts = () => [...document.head.querySelectorAll('script')].map((script) => script.src)

// PayPal serves its button's script from one host for the sandbox and another for real money.
it('loads PayPal’s script from the host of the shop’s environment', () => {
  void paypalSession({ clientId: 'client', environment: 'sandbox' }, 'en', callbacks)
  expect(scripts()).toEqual(['https://www.sandbox.paypal.com/web-sdk/v6/core'])
  document.head.querySelector('script')?.remove()
  void paypalSession({ clientId: 'client', environment: 'live' }, 'en', callbacks)
  expect(scripts()).toEqual(['https://www.paypal.com/web-sdk/v6/core'])
})
