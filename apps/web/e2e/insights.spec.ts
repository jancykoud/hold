import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expectFitsEveryWidth } from './support/responsive'
import { expectInShop } from './support/sign-in'
import { expect, test } from './support/test'

// The insights dashboard (extensions.md section 12.5), as the demo shop's owner and counter staff open it: the money
// ledger's and the fleet's figures, drawn by Hold with no library, each figure in words beside its bar.

async function openInsights(page: Page, as: 'Tomás, the owner' | 'Jonas, at the counter' = 'Tomás, the owner'): Promise<void> {
  await page.goto('/sign-in')
  await page.getByRole('region', { name: 'Try the demo shop' }).getByRole('button', { name: `Start a demo as ${as}` }).click()
  await expectInShop(page, 'Ribeira Rentals')
  // The menu lists Insights only for those it opens for; counter staff can still follow a link to it.
  if (as === 'Tomás, the owner') await page.getByRole('navigation', { name: 'Shop pages' }).getByRole('link', { name: 'Insights' }).click()
  else await page.goto('/shop/insights')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Insights')
}

const panel = (page: Page, title: string) => page.getByRole('region', { name: title })

test('an owner opens the dashboard on the shop’s own figures, the same the money page shows', async ({ page }) => {
  await openInsights(page)
  await expect(page.getByText('Held on renters’ accounts now')).toBeVisible()
  await expect(page.getByText('€10,750.00').first()).toBeVisible()
  await expect(page.getByText('€998.00').first()).toBeVisible()
  await expect(page.getByText('€1,820.00').first()).toBeVisible()
  await expect(panel(page, 'Money by month').getByRole('listitem').first()).toContainText('To the shop €998.00')
  await expect(panel(page, 'Damage priced and recovered, by item type').getByRole('listitem').first()).toContainText('Damage priced')
})

test('each live hold is on its 29 days and the settlement steps down, beside holds by trust rung and every item', async ({ page }) => {
  await openInsights(page)
  await expect(panel(page, 'Holds by trust rung').getByRole('listitem').first()).toContainText('Hold given')
  await expect(panel(page, 'Each hold on its 29 days').getByText(/^Day \d+ of 29 · (Assured|Valid|Ending) · €[\d,.]+ held$/).first()).toBeVisible()
  const waterfall = panel(page, 'Reserved, captured, released')
  await expect(waterfall.getByText('Captured and released stay within what was reserved.')).toBeVisible()
  await expect(waterfall.getByText('Still held')).toBeVisible()
  await expect(panel(page, 'Every item').getByRole('row', { name: /Hatchback 3/ })).toContainText('Yes')
})

test('counter staff are not offered Insights in the menu, and are told only the owner or a manager opens it', async ({ page }) => {
  await openInsights(page, 'Jonas, at the counter')
  await expect(page.getByRole('navigation', { name: 'Shop pages' }).getByRole('link', { name: 'Insights' })).toHaveCount(0)
  await expect(page.getByText('Only the owner or a manager opens the insights dashboard.')).toBeVisible()
  await expect(panel(page, 'Money by month')).toHaveCount(0)
})

test('the dashboard fits a phone, a tablet and a laptop, the table of items scrolling inside its own frame', async ({ page }) => {
  await openInsights(page)
  await expect(page.getByText('€10,750.00').first()).toBeVisible()
  await expectFitsEveryWidth(page)
})

for (const theme of ['light', 'dark'] as const) {
  test(`the insights page passes the accessibility checks in the ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await openInsights(page)
    await expect(page.getByText('€10,750.00').first()).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([])
  })
}
