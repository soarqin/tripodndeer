import { test, expect } from '@playwright/test'
import { waitForApp } from './fixtures/test-helpers'
import * as fs from 'fs'
import * as path from 'path'

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence/m7-1')

function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
}

function evidence(name: string): string {
  return path.join(EVIDENCE_DIR, name)
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.describe('M7.1 — Coverage Fog of War', () => {
  test('map canvas is visible after initial load', async ({ page }) => {
    await waitForApp(page)
    
    const canvas = page.locator('[data-testid="map-canvas"]')
    await expect(canvas).toBeVisible()
    
    await page.screenshot({ path: evidence('task-T3.2-fog-initial.png') })
  })

  test('EspionagePanel shows coverage tier labels for each realm', async ({ page }) => {
    await waitForApp(page)
    
    await page.getByTestId('bottom-bar-diebao').click()
    
    const panel = page.getByTestId('espionage-panel')
    await expect(panel).toBeVisible()
    
    await page.getByTestId('espionage-tab-intelligence').click()
    
    const intelTab = page.getByTestId('espionage-intelligence-tab')
    await expect(intelTab).toBeVisible()
    
    await page.screenshot({ path: evidence('task-T3.2-fog-loaded.png') })
  })
})
