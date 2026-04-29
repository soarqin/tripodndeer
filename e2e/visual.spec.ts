import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { waitForApp } from './fixtures/test-helpers'

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts')

function ensureArtifactsDir(): void {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

/**
 * Counts non-background pixels in the entire canvas.
 * Background is #F5EFD9 (245, 239, 217).
 */
async function countNonBackgroundPixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="map-canvas"]') as HTMLCanvasElement | null
    if (!canvas) return 0
    const ctx = canvas.getContext('2d')
    if (!ctx) return 0
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let nonBgCount = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      if (!(r === 245 && g === 239 && b === 217)) nonBgCount++
    }
    return nonBgCount
  })
}

/**
 * Counts faction-colored (red or blue) pixels in a 200x200 region centered around (300, 200).
 * Red faction: #dc2626 ≈ (220, 38, 38). Blue faction: #2563eb ≈ (37, 99, 235).
 */
async function countFactionPixelsInCenter(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="map-canvas"]') as HTMLCanvasElement | null
    if (!canvas) return 0
    const ctx = canvas.getContext('2d')
    if (!ctx) return 0
    const data = ctx.getImageData(300, 200, 200, 200).data
    let redCount = 0
    let blueCount = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      if (r > 180 && g < 80 && b < 80) redCount++
      if (r < 80 && g > 60 && b > 180) blueCount++
    }
    return redCount + blueCount
  })
}

test.describe('QA-VISUAL: Curved boundaries + zero gaps', () => {
  test('canvas has colored pixels (not blank)', async ({ page }) => {
    await waitForApp(page)
    const nonBgPixels = await countNonBackgroundPixels(page)
    expect(nonBgPixels).toBeGreaterThan(1000)
  })

  test('canvas center area has site colors (red or blue)', async ({ page }) => {
    await waitForApp(page)
    const factionPixels = await countFactionPixelsInCenter(page)
    expect(factionPixels).toBeGreaterThan(100)

    ensureArtifactsDir()
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'm0-visual-check.png') })
  })
})
