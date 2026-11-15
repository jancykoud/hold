import type { Page } from '@playwright/test'
import { expectFitsEveryWidth } from './support/responsive'
import { bookAtTheCounter, feePaidAndHoldPlaced } from './support/rental'
import { addItems, ownerWithPrices } from './support/shop'
import { expect, test } from './support/test'

// A vehicle's dashboard (docs/vehicle-plan.md step 3, part B): staff read the kilometres and the fuel at the handover
// and at the return, neither is sealed without them, and the renter reads them on the condition report.

async function carShop(page: Page): Promise<void> {
  await ownerWithPrices(page, 'Porto Cars')
  await page.getByRole('navigation', { name: 'Shop pages' }).getByRole('link', { name: 'PayPal' }).click()
  await page.getByLabel('Client ID').fill('sandbox-client-id-for-the-test')
  await page.getByLabel('Secret').fill('sandbox-secret-for-the-test')
  await page.getByRole('button', { name: 'Check and connect' }).click()
  await expect(page.getByText('Connected. PayPal accepted the credentials.')).toBeVisible()
  await page.getByRole('navigation', { name: 'Shop pages' }).getByRole('link', { name: 'Items' }).click()
  await page.getByRole('link', { name: 'New item type' }).first().click()
  await page.getByLabel('Name').fill('Compact car')
  await page.getByLabel('Kind').selectOption('car')
  await expect(page.getByRole('textbox', { name: 'View 19', exact: true })).toHaveValue('Dashboard, with mileage and fuel')
  await page.getByLabel('Value to replace, in EUR').fill('18000')
  await page.getByLabel('Hold while it is out, in EUR').fill('1200')
  await page.getByLabel('Fee per day, in EUR').fill('60')
  await page.getByRole('button', { name: 'Save item type' }).click()
  await expect(page).toHaveURL(/\/shop\/items$/)
  // Two cars, so one is still free once the first is booked.
  await addItems(page, 'Compact car', '2', '')
}

// The test browser has no camera, so each needed view is the sample photograph.
async function photographNeededViews(page: Page): Promise<void> {
  const views = page.getByRole('list', { name: 'Views' })
  await expect(views).toBeVisible()
  const needed = await views.getByText('Needed').count()
  expect(needed).toBeGreaterThan(0)
  for (let taken = 1; taken <= needed; taken += 1) {
    await page.getByRole('button', { name: 'Use the sample photograph' }).click()
    await expect(views.getByText('Photographed')).toHaveCount(taken, { timeout: 30_000 })
  }
}

// The panel where the dashboard is read; the car's last view is named for the dashboard too.
const dashboard = (page: Page) => page.getByRole('region', { name: 'Dashboard', exact: true })

async function read(page: Page, kilometres: string, fuel: string): Promise<void> {
  await dashboard(page).getByLabel('Kilometres on the odometer').fill(kilometres)
  await dashboard(page).getByLabel('Fuel in the tank').selectOption({ label: fuel })
  await dashboard(page).getByRole('button', { name: 'Save the reading' }).click()
}

test('a car is handed over and returned only once its dashboard is read, and the renter reads what staff read', async ({ page, browser }) => {
  test.setTimeout(420_000)
  await carShop(page)
  await bookAtTheCounter(page, 'Compact car')
  await feePaidAndHoldPlaced(page, browser)
  await page.getByRole('region', { name: 'Handover' }).getByRole('button', { name: /^Photograph / }).click()
  await expect(page).toHaveURL(/\/handover\/[0-9a-f-]{36}$/)
  await photographNeededViews(page)

  // Every needed view is photographed, and the handover still waits for the dashboard.
  const seal = page.getByRole('button', { name: 'Seal the photographs' })
  await expect(seal).toBeDisabled()
  await expect(page.getByText('Read the dashboard before sealing.')).toBeVisible()
  await expectFitsEveryWidth(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await read(page, '48210', 'Full')
  await expect(page.getByText('Reading saved.')).toBeVisible()
  await expect(seal).toBeEnabled()
  await seal.click()
  await expect(page.getByText('The rental is out.')).toBeVisible()
  await expect(dashboard(page)).toContainText('48,210 km, full tank')

  // The renter, on their own phone, reads the same figures beside the photographs they were read from.
  const renter = await (await browser.newContext()).newPage()
  await renter.goto((await page.getByTestId('renter-link').textContent()) ?? '')
  await expect(renter.getByText('Dashboard at handover')).toBeVisible()
  await expect(renter.getByText('48,210 km, full tank')).toBeVisible()
  await expectFitsEveryWidth(renter)
  await renter.context().close()

  // At the return, the handover's reading is shown, and an odometer that reads less is refused.
  await page.getByRole('link', { name: 'Back to the rental' }).last().click()
  await page.getByRole('button', { name: /^Start return for / }).click()
  await expect(page).toHaveURL(/\/return\/[0-9a-f-]{36}$/)
  await photographNeededViews(page)
  const sealReturn = page.getByRole('button', { name: 'Seal return photographs' })
  await expect(sealReturn).toBeDisabled()
  await expect(page.getByText('At handover: 48,210 km, full tank')).toBeVisible()
  await read(page, '48930', '5/8')
  await expect(page.getByText('Reading saved.')).toBeVisible()
  await expectFitsEveryWidth(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(sealReturn).toBeEnabled()
  await sealReturn.click()
  // Sealing a return of many views also queues its comparison, which takes a moment.
  await expect(page.getByText('These return photographs are sealed.', { exact: false })).toBeVisible({ timeout: 60_000 })
  // Sealed with the photographs: the page, read again, only says what was read.
  await page.reload()
  await expect(dashboard(page)).toContainText('48,930 km, 5/8 of a tank')
  await expect(dashboard(page).getByRole('button', { name: 'Save the reading' })).toHaveCount(0)
})
