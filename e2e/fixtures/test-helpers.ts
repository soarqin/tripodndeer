import type { Page } from '@playwright/test'

/** Wait for the app to be ready (TopBar visible). */
export async function waitForApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForSelector('[data-testid="top-bar-date"]', { timeout: 10000 })
}

/** Read current tick count from the TopBar. */
export async function getTickCount(page: Page): Promise<number> {
  const text = await page.locator('[data-testid="top-bar-tick-count"]').textContent()
  const match = text?.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

/** Click a speed-tier button (pause | 1x | 2x | 3x | 4x | 5x). */
export async function clickSpeed(page: Page, speed: string): Promise<void> {
  await page.click(`[data-testid="time-control-${speed}"]`)
}
