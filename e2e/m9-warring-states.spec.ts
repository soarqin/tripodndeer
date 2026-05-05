import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence/m9/final-qa')

function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.describe('M9 Warring States scenario', () => {
  test('loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/鼎鹿|Tripod/)
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm9-scenario-load.png') })

    expect(errors.length).toBe(0)
  })
})
