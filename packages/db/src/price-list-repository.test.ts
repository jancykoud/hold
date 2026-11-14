import { money } from '@hold/domain'
import { beforeAll, describe, expect, it } from 'vitest'
import { registerOwner } from './accounts.ts'
import { currentPriceList, publishPriceList } from './price-list-repository.ts'
import { inShop } from './scope.ts'
import type { Scope } from './scope.ts'
import { createTestDatabase } from './testing/test-database.ts'
import type { TestDatabase } from './testing/test-database.ts'

const NOW = new Date('2026-11-15T09:00:00Z')
const eur = (cents: number) => money(cents, 'EUR')

let database: TestDatabase
let owner: Scope

beforeAll(async () => {
  database = await createTestDatabase()
  const registered = await registerOwner(database, { subject: 'owner', email: 'ana@porto-cars.example', name: 'Ana', language: 'en', shop: { name: 'Porto Cars', timeZone: 'Europe/Lisbon' } })
  owner = { role: 'hold_app', shopId: registered.shopId, userId: registered.userId }
})

describe('a published price list', () => {
  // A vehicle's readings are charged at these two (readings.ts in packages/domain): a price for one, taken as many
  // times as the dashboard says.
  it('keeps the price of a kilometre beyond those included and of an eighth of a tank, each under its own kind', async () => {
    const published = await inShop(database, owner, (transaction) =>
      publishPriceList(transaction, owner.shopId, {
        currency: 'EUR',
        ownerApprovalThreshold: undefined,
        entries: [
          { description: 'Scratch through the paint', category: 'damage', amount: eur(180_00) },
          { description: 'Each kilometre beyond those included', category: 'mileage', amount: eur(30) },
          { description: 'Each eighth of a tank missing', category: 'fuel', amount: eur(12_00) },
        ],
        wearPolicy: 'Stone chips smaller than a coin are ordinary wear.',
      }, NOW),
    )
    expect(published).toEqual({ ok: true, version: 1 })
    const list = await inShop(database, owner, currentPriceList)
    expect(list?.entries.map((entry) => [entry.category, entry.amountCents])).toEqual([['damage', 180_00], ['mileage', 30], ['fuel', 12_00]])
  })
})
