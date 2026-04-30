import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { clickSpeed, waitForApp } from './fixtures/test-helpers'

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts')

function ensureArtifactsDir(): void {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

test.describe('QA-DELIVERABLE-1: All testids present + screenshots', () => {
  test('all required data-testid selectors exist', async ({ page }) => {
    await waitForApp(page)

    // TopBar testids
    await expect(page.locator('[data-testid="top-bar-date"]')).toBeVisible()
    await expect(page.locator('[data-testid="top-bar-speed"]')).toBeVisible()
    await expect(page.locator('[data-testid="top-bar-tick-count"]')).toBeVisible()

    // Map canvas
    await expect(page.locator('[data-testid="map-canvas"]')).toBeVisible()

    // TimeControlBar buttons
    for (const tier of ['pause', '1x', '2x', '3x', '4x', '5x']) {
      await expect(page.locator(`[data-testid="time-control-${tier}"]`)).toBeVisible()
    }

    // Initial-state screenshot for the QA deliverable matrix
    ensureArtifactsDir()
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'm0-initial.png') })
  })

  test('paused screenshot', async ({ page }) => {
    await waitForApp(page)
    await clickSpeed(page, 'pause')
    await page.waitForTimeout(500)

    ensureArtifactsDir()
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'm0-paused.png') })
  })

  test('after-30s screenshot at 5x speed', async ({ page }) => {
    // Allow enough headroom for app startup, a 35s capture window, and the
    // final screenshot write without making the long-form deliverable flaky.
    test.setTimeout(90000)

    await waitForApp(page)
    await clickSpeed(page, '5x')
    // Long tail produces ≥35s of demo footage for the recorded video.
    await page.waitForTimeout(35000)

    ensureArtifactsDir()
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'm0-after-30s.png') })
  })
})
