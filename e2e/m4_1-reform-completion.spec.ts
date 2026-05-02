import { test, expect } from '@playwright/test'
import { waitForApp } from './fixtures/test-helpers'

test.describe('M4.1 reform UI integration', () => {
  test('Economy panel shows Qin pre-applied reform trait (商鞅变法)', async ({ page }) => {
    await waitForApp(page)
    await page.getByTestId('bottom-bar-neizheng').click()

    const panel = page.getByTestId('economy-panel')
    await expect(panel).toBeVisible()

    const traitList = page.getByTestId('reform-trait-list')
    await expect(traitList).toBeVisible()
    await expect(traitList).toContainText('商鞅变法')
  })

  test('Economy panel shows Qin political system as 法家集权', async ({ page }) => {
    await waitForApp(page)
    await page.getByTestId('bottom-bar-neizheng').click()

    const panel = page.getByTestId('economy-panel')
    await expect(panel).toBeVisible()

    const systemDisplay = page.getByTestId('political-system-display')
    await expect(systemDisplay).toBeVisible()
    await expect(systemDisplay).toHaveText('法家集权')
  })

  test('Economy panel reform section is visible and contains expected labels', async ({ page }) => {
    await waitForApp(page)
    await page.getByTestId('bottom-bar-neizheng').click()

    const panel = page.getByTestId('economy-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('变法')
    await expect(panel).toContainText('政治体制')
    await expect(panel).toContainText('变法特质')

    await expect(page.getByTestId('political-system-display')).toBeVisible()
    await expect(page.getByTestId('reform-trait-list')).toBeVisible()
  })
})
