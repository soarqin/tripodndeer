import { test, expect } from '@playwright/test'
import { clickSpeed } from './fixtures/test-helpers'

test.describe('QA-FUNC-1: All sites turn red at 5x speed', () => {
  test('demo-complete banner appears within 90s at 5x speed', async ({ page }) => {
    // `?paintInterval=1` is consumed by the dev entrypoint to speed up the demo
    // when the URL override is wired up; if absent, the default cadence still
    // resolves comfortably inside the 90s budget on M0's 5-site graph.
    await page.goto('/?paintInterval=1')
    await page.waitForSelector('[data-testid="top-bar-date"]', { timeout: 10000 })

    await clickSpeed(page, '5x')

    // Poll for the demo-complete banner that the App renders once every site
    // is owned by the red faction.
    await page.waitForSelector('[data-testid="demo-complete"]', { timeout: 90000 })
    await expect(page.locator('[data-testid="demo-complete"]')).toBeVisible()
  })
})
