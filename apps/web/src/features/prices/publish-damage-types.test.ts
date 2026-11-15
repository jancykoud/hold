// @vitest-environment node
import { currentPriceList, inShop, registerOwner } from '@hold/db'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

process.env['HOLD_ENVIRONMENT'] = 'test'
process.env['HOLD_COOKIE_KEY'] = Buffer.alloc(32, 9).toString('base64')

const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
      set: (name: string, value: string) => jar.set(name, value),
      delete: (cookie: string | { name: string }) => jar.delete(typeof cookie === 'string' ? cookie : cookie.name),
    }),
  headers: () => Promise.resolve(new Headers()),
}))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
vi.mock('next-intl/server', () => ({ getTranslations: () => Promise.resolve((key: string) => key) }))

const shop = await import('@/features/shop/actions')
const { getServices } = await import('@/server/services')
const { form, signIn } = await import('@/test/shop-session')

vi.setConfig({ testTimeout: 30_000 })

const OWNER = 'owner@porto-cars.example'
let shopId: string
let ownerId: string

// Each row of the editor sends its type of damage, or nothing, in step with its description, kind and amount.
const list = { currency: 'EUR', threshold: '', wearPolicy: 'Stone chips smaller than a coin are ordinary wear.', description: ['Scratch through the paint', 'Cracked windscreen', 'Lost key'], category: ['damage', 'damage', 'loss'], amount: ['180', '420', '250'], locale: 'en' }

beforeAll(async () => {
  const { database } = await getServices()
  const subject = await signIn(jar, OWNER, 'passkey')
  const registered = await registerOwner(database, { subject, email: OWNER, name: 'Ana', language: 'en', shop: { name: 'Porto Cars', timeZone: 'Europe/Lisbon' } })
  shopId = registered.shopId
  ownerId = registered.userId
})

beforeEach(() => {
  jar.clear()
})

// docs/vehicle-plan.md step 2: a price for damage may name its type of damage.
describe('publishing a price list with types of damage', () => {
  it('keeps the type each price for damage names, and none where none is named', async () => {
    await signIn(jar, OWNER, 'passkey')
    expect(await shop.publishPrices(null, form({ ...list, damageType: ['scratch', 'broken_glass', ''] }))).toMatchObject({ ok: true })
    const { database } = await getServices()
    const published = await inShop(database, { role: 'hold_app', shopId, userId: ownerId }, currentPriceList)
    expect(published?.entries.map((entry) => entry.damageType)).toEqual(['scratch', 'broken_glass', null])
  })

  it('refuses a type of damage on a price that is not for damage, a type it does not know, and rows that do not line up', async () => {
    await signIn(jar, OWNER, 'passkey')
    expect(await shop.publishPrices(null, form({ ...list, damageType: ['scratch', '', 'dent'] }))).toEqual({ ok: false, failure: 'refused', reason: 'damage_type_misplaced:2' })
    expect(await shop.publishPrices(null, form({ ...list, damageType: ['rust', '', ''] }))).toMatchObject({ ok: false, failure: 'invalid' })
    expect(await shop.publishPrices(null, form({ ...list, damageType: ['scratch'] }))).toEqual({ ok: false, failure: 'refused', reason: 'rows_mismatched' })
  })

  it('still takes a list that names no type at all, as every list before did', async () => {
    await signIn(jar, OWNER, 'passkey')
    expect(await shop.publishPrices(null, form(list))).toMatchObject({ ok: true })
  })
})
