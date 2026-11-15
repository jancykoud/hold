import 'server-only'
import { createPayPalClient } from '@hold/paypal'
import type { PayPalCredentials, PayPalEnvironment } from '@hold/paypal'

export type CredentialCheck = 'accepted' | 'refused' | 'unavailable'

// Asks PayPal for a token with the credentials a shop pasted, before anything is kept. It asks the PayPal the shop's
// holds will be placed with: live credentials are unknown to the sandbox, and the sandbox's to live.
export async function checkWithPayPal(environment: PayPalEnvironment, credentials: PayPalCredentials, fetch?: typeof globalThis.fetch): Promise<CredentialCheck> {
  const client = createPayPalClient({ environment, credentials: () => Promise.resolve(credentials), ...(fetch === undefined ? {} : { fetch }) })
  const checked = await client.checkCredentials()
  if (checked.ok) return 'accepted'
  return checked.error.kind === 'unavailable' ? 'unavailable' : 'refused'
}
