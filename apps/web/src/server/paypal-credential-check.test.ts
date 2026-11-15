import { expect, it } from 'vitest'
import { checkWithPayPal } from './paypal-credential-check'

const credentials = { clientId: 'client-id-of-the-shop', clientSecret: 'secret-of-the-shop' }

// A shop's credentials are checked where its holds will be placed: live ones are unknown to the sandbox, and a check
// against the wrong PayPal would refuse every real account.
it('checks a shop’s credentials with the PayPal of the deployment’s mode', async () => {
  const asked: string[] = []
  const fetch = ((input: RequestInfo | URL) => {
    asked.push(new URL(input instanceof Request ? input.url : input).host)
    return Promise.resolve(Response.json({ access_token: 'token', expires_in: 3600 }))
  }) as typeof globalThis.fetch
  expect(await checkWithPayPal('sandbox', credentials, fetch)).toBe('accepted')
  expect(await checkWithPayPal('live', credentials, fetch)).toBe('accepted')
  expect(asked).toEqual(['api-m.sandbox.paypal.com', 'api-m.paypal.com'])
})

it('says refused when PayPal does not know the credentials', async () => {
  const fetch = (() => Promise.resolve(Response.json({ error: 'invalid_client' }, { status: 401 }))) as typeof globalThis.fetch
  expect(await checkWithPayPal('live', credentials, fetch)).toBe('refused')
})
