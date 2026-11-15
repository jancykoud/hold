import type { Page } from '@playwright/test'
import { expectFitsEveryWidth } from './support/responsive'
import { bookAtTheCounter, feePaidAndHoldPlaced } from './support/rental'
import { addItems, ownerWithPrices } from './support/shop'
import { expect, test } from './support/test'

// The longest photo plan a shop can save (docs/vehicle-plan.md step 1): 24 views, every one required, walked at a
// handover and at a return at the width of a small phone, and no 25th view to add.

const VIEWS = 24

async function shopWithTheLongestPlan(page: Page): Promise<void> {
  await ownerWithPrices(page, 'Porto Long Plans')
  await page.getByRole('navigation', { name: 'Shop pages' }).getByRole('link', { name: 'PayPal' }).click()
  await page.getByLabel('Client ID').fill('sandbox-client-id-for-the-test')
  await page.getByLabel('Secret').fill('sandbox-secret-for-the-test')
  await page.getByRole('button', { name: 'Check and connect' }).click()
  await expect(page.getByText('Connected. PayPal accepted the credentials.')).toBeVisible()
  await page.getByRole('navigation', { name: 'Shop pages' }).getByRole('link', { name: 'Items' }).click()
  await page.getByRole('link', { name: 'New item type' }).first().click()
  await page.getByLabel('Name').fill('Touring e-bike')
  await page.getByLabel('Kind').selectOption('e_bike')
  // The kind suggests six views; the rest are added by hand, up to the limit.
  await expect(page.getByRole('textbox', { name: 'View 6', exact: true })).toHaveValue('Battery')
  const add = page.getByRole('button', { name: 'Add a view' })
  for (let number = 7; number <= VIEWS; number += 1) {
    await add.click()
    await page.getByRole('textbox', { name: `View ${String(number)}`, exact: true }).fill(`Detail ${String(number)}`)
  }
  // The six suggested views are required already; the ones added by hand are optional until switched.
  for (let number = 7; number <= VIEWS; number += 1) {
    const required = page.getByRole('switch', { name: `View ${String(number)} is required` })
    await required.click({ timeout: 10_000 })
    await expect(required).toBeChecked()
  }
  await expect(page.getByRole('switch', { checked: true })).toHaveCount(VIEWS)
  await expect(add).toBeDisabled()
  await page.getByLabel('Value to replace, in EUR').fill('3200')
  await page.getByLabel('Hold while it is out, in EUR').fill('400')
  await page.getByLabel('Fee per day, in EUR').fill('55')
  await expectFitsEveryWidth(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByRole('button', { name: 'Save item type' }).click()
  await expect(page).toHaveURL(/\/shop\/items$/)
  await addItems(page, 'Touring e-bike', '1', '')
}

// The test browser has no camera, so each view is the sample photograph, checked and uploaded the same way.
async function photographEveryView(page: Page): Promise<void> {
  const views = page.getByRole('list', { name: 'Views' })
  await expect(views.getByRole('listitem')).toHaveCount(VIEWS)
  await expect(views.getByText('Needed')).toHaveCount(VIEWS)
  for (let taken = 1; taken <= VIEWS; taken += 1) {
    await page.getByRole('button', { name: 'Use the sample photograph' }).click()
    await expect(views.getByText('Photographed')).toHaveCount(taken, { timeout: 30_000 })
  }
}

test('a plan of 24 views, the most a shop can save, is walked at a handover and at a return on a small phone', async ({ page, browser }) => {
  test.setTimeout(420_000)
  await shopWithTheLongestPlan(page)
  await bookAtTheCounter(page, 'Touring e-bike')
  await feePaidAndHoldPlaced(page, browser)

  await page.getByRole('region', { name: 'Handover' }).getByRole('button', { name: /^Photograph / }).click()
  await expect(page).toHaveURL(/\/handover\/[0-9a-f-]{36}$/)
  await page.setViewportSize({ width: 360, height: 780 })
  await photographEveryView(page)
  await expectFitsEveryWidth(page)
  await page.setViewportSize({ width: 360, height: 780 })
  await page.getByRole('button', { name: 'Seal the photographs' }).click()
  await expect(page.getByText('The rental is out.')).toBeVisible()

  await page.getByRole('link', { name: 'Back to the rental' }).last().click()
  await page.getByRole('button', { name: /^Start return for / }).click()
  await expect(page).toHaveURL(/\/return\/[0-9a-f-]{36}$/)
  await page.setViewportSize({ width: 360, height: 780 })
  await photographEveryView(page)
  await expectFitsEveryWidth(page)
  await page.setViewportSize({ width: 360, height: 780 })
  await page.getByRole('button', { name: 'Seal return photographs' }).click()
  // Sealing a return of many views also queues its comparison, which takes a moment.
  await expect(page.getByText('These return photographs are sealed.', { exact: false })).toBeVisible({ timeout: 60_000 })
})
