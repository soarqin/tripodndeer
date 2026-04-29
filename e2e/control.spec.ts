import { test, expect } from '@playwright/test'
import { clickSpeed, getTickCount, waitForApp } from './fixtures/test-helpers'

test.describe('QA-CONTROL-1: Pause stops tick', () => {
  test('pause freezes the tick counter', async ({ page }) => {
    await waitForApp(page)

    // Run at 3x for a few seconds so ticks are advancing.
    await clickSpeed(page, '3x')
    await page.waitForTimeout(3000)
    const tickBefore = await getTickCount(page)

    // Pause and wait — the tick counter must stay constant while paused.
    await clickSpeed(page, 'pause')
    await page.waitForTimeout(5000)
    const tickAfter = await getTickCount(page)

    expect(tickAfter).toBe(tickBefore)
  })
})
