import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { acceptClaim, handedOverAndReturned } from './support/claim'
import { addVirtualAuthenticator } from './support/passkey'
import { expectFitsEveryWidth } from './support/responsive'
import { bookAtTheCounter, feePaidAndHoldPlaced, renterBrowser } from './support/rental'
import { expectInShop, startDemo } from './support/sign-in'
import { expect, test } from './support/test'

// Each judge's demo is their own (architecture.md section 20.3): one tap opens a new Ribeira Rentals with new accounts,
// and nobody else's demo is reachable from it.

// The address of one sample rental in the shop the page is signed in to.
async function aRental(page: Page): Promise<string> {
  await page.goto('/shop/rentals')
  await page.getByRole('link', { name: /Priya Natarajan/ }).first().click()
  await expect(page).toHaveURL(/\/shop\/rentals\/[0-9a-f-]{36}$/)
  return page.url()
}

async function signOut(page: Page, person: 'Tomás' | 'Jonas'): Promise<void> {
  await page.getByRole('button', { name: `Account of ${person}` }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/:\d+\/$/)
}

test('a judge starts a demo of their own with one tap, and finds the shop already busy', async ({ page }) => {
  await startDemo(page, 'Tomás, the owner')
  await expect(page.getByRole('button', { name: 'Account of Tomás' })).toContainText(/tomas\.[a-z0-9]+@demo\.hold\.example/)
  await expect(page.getByText('Priya Natarajan').first()).toBeVisible()
})

// A sample rental's photographs are the demonstration's own images, and its record is prepared from them (audit F-M1).
test('a judge prepares the current record of a sample rental, from the demonstration’s own photographs', async ({ page }) => {
  await startDemo(page, 'Tomás, the owner')
  await aRental(page)
  await page.getByRole('link', { name: 'Your rental record', exact: true }).click()
  await page.getByRole('button', { name: 'Prepare current record', exact: true }).click()
  await expect(page.getByRole('region', { name: /^Version [0-9]+$/ }).first().getByText('Ready to download')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('The record could not be prepared. Please try again.')).toHaveCount(0)
  await expectFitsEveryWidth(page)
})

test('a judge starts a demo at the counter, as Jonas', async ({ page }) => {
  await startDemo(page, 'Jonas, at the counter')
  await expect(page.getByRole('button', { name: 'Account of Jonas' })).toContainText(/jonas\.[a-z0-9]+@demo\.hold\.example/)
})

test('the browser that started a demo comes back to it as Jonas, in the same shop; another judge’s demo cannot reach it', async ({ page, browser, browserErrors }) => {
  await startDemo(page, 'Tomás, the owner')
  const rental = await aRental(page)
  await signOut(page, 'Tomás')

  await page.goto('/sign-in')
  await page.getByRole('region', { name: 'Try the demo shop' }).getByRole('button', { name: 'Continue as Jonas, at the counter' }).click()
  await expectInShop(page, 'Ribeira Rentals')
  await expect(page.getByRole('button', { name: 'Account of Jonas' })).toBeVisible()
  expect((await page.goto(rental))?.status()).toBe(200)

  const other = await (await browser.newContext()).newPage()
  await startDemo(other, 'Tomás, the owner')
  expect(await aRental(other)).not.toBe(rental)
  expect((await other.goto(rental))?.status()).toBe(404)
  await other.context().close()
  // A browser that started no demo has none to continue: it is offered a new one only.
  const stranger = await (await browser.newContext()).newPage()
  await stranger.goto('/sign-in')
  await expect(stranger.getByRole('button', { name: /^Continue as/ })).toHaveCount(0)
  await stranger.context().close()
  // The 404 the second judge's browser logs is the point of this test. The fixture watches the first page only.
  browserErrors.length = 0
})

test('starting a fresh demo opens a new shop with new accounts', async ({ page, browserErrors }) => {
  await startDemo(page, 'Tomás, the owner')
  const first = await aRental(page)
  const firstAccount = await page.getByRole('button', { name: 'Account of Tomás' }).textContent()

  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Start a fresh demo' }).click()
  await expectInShop(page, 'Ribeira Rentals')
  expect(await page.getByRole('button', { name: 'Account of Tomás' }).textContent()).not.toBe(firstAccount)
  expect((await page.goto(first))?.status()).toBe(404)
  // The 404 is the point: the first demo's rental is not this demo's.
  browserErrors.length = 0
})

// The README's judge path. Jonas's limit is below the shop's owner threshold, so nothing he does here asks for a
// passkey, and no authenticator is attached: a passkey prompt anywhere would stop the test.
test('as Jonas, a judge takes a damaged return to a PayPal capture without adding a passkey', async ({ page, browser }) => {
  test.setTimeout(240000)
  await startDemo(page, 'Jonas, at the counter')
  await bookAtTheCounter(page, 'City bike')
  await feePaidAndHoldPlaced(page, browser)
  await handedOverAndReturned(page, 'Use the sample with damage')
  // The comparison found the chip; the stand-in prices nothing, so Jonas chooses the agreed price for the finding.
  await page.getByRole('checkbox', { name: /^Simulated: code found a change in this area/ }).first().check()
  await page.getByLabel('Agreed price for this finding').selectOption({ label: 'Scratch on the frame, through the paint · €35.00' })
  await page.getByRole('button', { name: 'Prepare claim for review', exact: true }).click()
  await page.getByRole('button', { name: 'Approve and show renter link', exact: true }).click()
  const link = (await page.getByTestId('renter-link').textContent()) ?? ''
  const renter = await renterBrowser(browser)
  await renter.goto(link)
  await acceptClaim(renter)
  await renter.context().close()
  await page.reload()
  await expect(page.getByText('Settlement confirmed', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Settlement amounts' })).toContainText('€35.00')
})

// The demonstration a vehicle rental business is shown: the demo shop's own car, walked round in the views its plan
// needs, its dashboard read at the handover and at the return, and a scratch charged at the price the renter accepted.
test('as Jonas, a scratched car goes from its walk round to a PayPal capture of the published price', async ({ page, browser }) => {
  test.setTimeout(420000)
  await startDemo(page, 'Jonas, at the counter')
  await bookAtTheCounter(page, 'Compact car')
  await feePaidAndHoldPlaced(page, browser)
  await page.getByRole('region', { name: 'Handover' }).getByRole('button', { name: /^Photograph / }).click()
  const views = page.getByRole('list', { name: 'Views' })
  const dashboard = page.getByRole('region', { name: 'Dashboard', exact: true })
  const walk = async (sample: string, kilometres: string) => {
    await expect(views.getByRole('listitem')).toHaveCount(19)
    const needed = await views.getByText('Needed').count()
    for (let taken = 1; taken <= needed; taken += 1) {
      await page.getByRole('button', { name: sample }).click()
      await expect(views.getByText('Photographed')).toHaveCount(taken, { timeout: 30000 })
    }
    await dashboard.getByLabel('Kilometres on the odometer').fill(kilometres)
    await dashboard.getByLabel('Fuel in the tank').selectOption({ label: 'Full' })
    await dashboard.getByRole('button', { name: 'Save the reading' }).click()
    await expect(page.getByText('Reading saved.')).toBeVisible()
  }
  await walk('Use the sample photograph', '48210')
  await page.getByRole('button', { name: 'Seal the photographs', exact: true }).click()
  await expect(page.getByText('The rental is out.')).toBeVisible()
  await page.getByRole('link', { name: 'Back to the rental' }).last().click()
  await page.getByRole('button', { name: /^Start return for / }).click()
  await walk('Use the sample with damage', '48330')
  await page.getByRole('button', { name: 'Seal return photographs', exact: true }).click()
  await expect(page.getByText('These return photographs are sealed.', { exact: false })).toBeVisible({ timeout: 60000 })
  await page.getByRole('link', { name: 'Back to the rental', exact: true }).first().click()
  await page.getByRole('link', { name: 'Claim and settlement', exact: true }).click()
  await page.getByRole('checkbox', { name: /^Simulated: code found a change in this area/ }).first().check()
  await page.getByLabel('Agreed price for this finding').selectOption({ label: 'Scratch on the bodywork, through the paint · €180.00' })
  await page.getByRole('button', { name: 'Prepare claim for review', exact: true }).click()
  await page.getByRole('button', { name: 'Approve and show renter link', exact: true }).click()
  const renter = await renterBrowser(browser)
  await renter.goto((await page.getByTestId('renter-link').textContent()) ?? '')
  await expect(renter.getByText('Type of damage: Scratch')).toBeVisible()
  await acceptClaim(renter)
  await renter.context().close()
  await page.reload()
  await expect(page.getByText('Settlement confirmed', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Settlement amounts' })).toContainText('€180.00')
})

// Decided on 15 November 2026 (docs/vehicle-plan.md step 3): a car is left at the car park with nobody at the counter.
// Its renter photographs it and reads its dashboard, and the report waits for a person in the morning.
test('a renter leaves the demo’s car at the car park, reads its dashboard, and the report waits in the morning queue', async ({ page, browser }) => {
  test.setTimeout(420000)
  await startDemo(page, 'Jonas, at the counter')
  await bookAtTheCounter(page, 'Compact car')
  await feePaidAndHoldPlaced(page, browser)
  const rental = page.url()
  await page.getByRole('region', { name: 'Handover' }).getByRole('button', { name: /^Photograph / }).click()
  const views = page.getByRole('list', { name: 'Views' })
  await expect(views.getByRole('listitem')).toHaveCount(19)
  const needed = await views.getByText('Needed').count()
  for (let taken = 1; taken <= needed; taken += 1) {
    await page.getByRole('button', { name: 'Use the sample photograph' }).click()
    await expect(views.getByText('Photographed')).toHaveCount(taken, { timeout: 30000 })
  }
  const counter = page.getByRole('region', { name: 'Dashboard', exact: true })
  await counter.getByLabel('Kilometres on the odometer').fill('48210')
  await counter.getByLabel('Fuel in the tank').selectOption({ label: 'Full' })
  await counter.getByRole('button', { name: 'Save the reading' }).click()
  await expect(page.getByText('Reading saved.')).toBeVisible()
  await page.getByRole('button', { name: 'Seal the photographs', exact: true }).click()
  await expect(page.getByText('The rental is out.')).toBeVisible()

  await page.goto(rental)
  await page.getByRole('button', { name: 'Show the link' }).click()
  const renter = await renterBrowser(browser)
  await renter.goto((await page.getByTestId('renter-link').textContent()) ?? '')
  await renter.getByRole('link', { name: 'Return it myself' }).click()
  await renter.getByRole('button', { name: 'Start the photographs' }).click()
  const renterViews = renter.getByRole('list', { name: 'Views' })
  // Every view of the handover again, and where the car was left.
  await expect(renterViews.getByRole('listitem')).toHaveCount(needed + 1)
  const toTake = await renterViews.getByText('Needed').count()
  for (let taken = 1; taken <= toTake; taken += 1) {
    await renter.getByRole('button', { name: 'Use the sample photograph' }).click()
    await expect(renterViews.getByText('Photographed')).toHaveCount(taken, { timeout: 30000 })
  }
  // Every photograph is taken, and the return still waits for the dashboard.
  const send = renter.getByRole('button', { name: 'Send my return' })
  await expect(renter.getByText('Read the dashboard before you send.')).toBeVisible()
  await expect(send).toBeDisabled()
  const dashboard = renter.getByRole('region', { name: 'Dashboard' })
  await expect(dashboard.getByText('When you took it: 48,210 km, full tank')).toBeVisible()
  await dashboard.getByLabel('Kilometres on the odometer').fill('48330')
  await dashboard.getByLabel('Fuel in the tank').selectOption({ label: '6/8' })
  await dashboard.getByRole('button', { name: 'Save the reading' }).click()
  await expect(dashboard.getByText('You read: 48,330 km, 6/8 of a tank')).toBeVisible()
  await renter.setViewportSize({ width: 360, height: 780 })
  await expectFitsEveryWidth(renter)
  await send.click()
  await expect(renter.getByRole('heading', { level: 1 })).toHaveText('Your return')
  await expect(renter.getByText('Reserved, not taken')).toBeVisible()
  await renter.context().close()

  await page.getByRole('navigation', { name: 'Shop pages' }).getByRole('link', { name: 'Morning queue' }).click()
  const waiting = page.getByRole('article', { name: /^Compact car/ })
  await expect(waiting).toContainText('Returned by the renter')
  await expect(waiting).toContainText('Hold €1,200.00 reserved')
})

// architecture.md section 8.2: staff let a walk-in pay the fee and approve the hold in one PayPal approval.
test('as Jonas, a judge books a walk-in whose renter approves the fee and the hold at once', async ({ page, browser }) => {
  await startDemo(page, 'Jonas, at the counter')
  await page.getByRole('navigation', { name: 'Shop pages' }).getByRole('link', { name: 'Rentals' }).click()
  await page.getByRole('link', { name: 'New rental' }).first().click()
  await page.getByRole('button', { name: 'One more City bike' }).click()
  await page.getByLabel('Name').fill('Walk-in Renter')
  await page.getByRole('checkbox', { name: /Walk-in: fee and hold in one PayPal approval/ }).check()
  await expectFitsEveryWidth(page)
  await page.getByRole('button', { name: 'Book', exact: true }).click()
  await expect(page).toHaveURL(/\/shop\/rentals\/[0-9a-f-]{36}$/)
  await expect(page.getByText(/A walk-in: the renter approves the fee and the hold together/)).toBeVisible()
  await page.getByRole('button', { name: 'Show the link' }).click()
  const link = (await page.getByTestId('renter-link').textContent()) ?? ''
  const renter = await renterBrowser(browser)
  await renter.goto(link)
  await expect(renter.getByRole('button', { name: /^Pay .* and approve the .* hold with PayPal$/ })).toBeVisible()
  await expectFitsEveryWidth(renter)
  await renter.getByRole('button', { name: /^Pay .* and approve the .* hold with PayPal$/ }).click()
  await renter.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(renter.getByText('Hold placed. Only your fee is charged.')).toBeVisible()
  await renter.context().close()
  await page.reload()
  await expect(page.getByRole('region', { name: 'Hold at pickup' }).getByText('Ready for handover.')).toBeVisible({ timeout: 15_000 })
})

test('on a wide screen the calendar draws each rental as a bar, and a bar opens its rental', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await startDemo(page, 'Tomás, the owner')
  await page.getByRole('navigation', { name: 'Shop pages' }).getByRole('link', { name: 'Calendar' }).click()
  const bar = page.locator('[data-rental-bar]').first()
  await expect(bar).toBeVisible()
  await bar.click()
  await expect(page).toHaveURL(/\/shop\/rentals\/[0-9a-f-]{36}$/)
})

for (const theme of ['light', 'dark'] as const) {
  test(`the calendar passes the accessibility checks in the ${theme} theme, its bars and headers included`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.emulateMedia({ colorScheme: theme })
    await startDemo(page, 'Tomás, the owner')
    await page.goto('/shop/calendar')
    await expect(page.locator('[data-rental-bar]').first()).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([])
  })
}

test('a judge adds a passkey to their own demo, then confirms with it', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await startDemo(page, 'Tomás, the owner')
  await page.goto('/shop/prices')
  await page.getByRole('link', { name: 'Add a passkey' }).click()
  await expect(page).toHaveURL(/\/shop\/security$/)
  await page.getByRole('button', { name: 'Add a passkey on this device' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Passkey 1' })).toBeVisible()
  await page.goto('/shop/prices')
  await page.getByRole('button', { name: 'Confirm with my passkey' }).click()
  await expect(page.getByRole('button', { name: 'Publish this price list' })).toBeVisible()
})
