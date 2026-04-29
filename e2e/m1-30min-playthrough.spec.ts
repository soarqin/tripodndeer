import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * QA-W4-T4.4: e2e for the M1 long-form playthrough.
 *
 * Verifies that the engine can run for ~30 minutes of in-game time at 5x
 * speed (≈ 6 minutes wall-clock, given the M1 spec of ~12 ticks/min real-time
 * at 5x — ample tick budget for a 30-min stress test) without:
 *
 *   1. Throwing any console.error or pageerror.
 *   2. Stalling the engine — the world.tick counter MUST advance significantly
 *      from its initial value.
 *
 * Strategy mirrors the rest of the M1 e2e suite:
 *   We drive the speed via the documented `[data-testid="time-control-5x"]`
 *   button and read the live world via the dev-only `window.__game.world()`
 *   debug hook (mounted in `src/ui/store/game-store.ts` under
 *   `import.meta.env.DEV`). No fake timers, no mocks — this is a real engine
 *   stress test.
 */

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence')
const PLAY_DURATION_MS = 360_000 // 6 minutes wall clock at 5x ≈ 30 min in-game

function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
}

async function waitForApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForSelector('[data-testid="bottom-bar-wanggong"]', { timeout: 10000 })
  await page.waitForFunction(
    () => {
      const game = (
        window as unknown as { __game?: { world: () => { sites: Map<string, unknown> } } }
      ).__game
      return Boolean(game && game.world && game.world().sites && game.world().sites.size > 0)
    },
    null,
    { timeout: 10000 },
  )
}

async function getTick(page: Page): Promise<number> {
  return page.evaluate(() => {
    type World = { tick: number }
    const game = (window as unknown as { __game: { world: () => World } }).__game
    return game.world().tick
  })
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.describe('M1 30-min Playthrough', () => {
  // 7-minute Playwright timeout: 6 minutes of gameplay + ~1 minute headroom.
  test.setTimeout(420_000)

  test('engine runs ~30 game-minutes at 5x without errors or stalls', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    await waitForApp(page)
    const initialTick = await getTick(page)

    await page.click('[data-testid="time-control-5x"]')

    // Drive engine for ~6 minutes wall-clock at 5x speed.
    await page.waitForTimeout(PLAY_DURATION_MS)

    const finalTick = await getTick(page)
    const ticksElapsed = finalTick - initialTick

    // Sanity: at 5x (400 ms/tick) over 6 minutes we expect ~900 ticks. We
    // assert a generous floor to absorb CI variance / tab throttling, but
    // anything below 100 indicates the engine has stalled.
    expect(
      ticksElapsed,
      `engine must advance > 100 ticks; observed ${ticksElapsed}`,
    ).toBeGreaterThan(100)

    expect(
      consoleErrors,
      `no console.error / pageerror permitted; observed: ${consoleErrors.join(' | ')}`,
    ).toEqual([])

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.4-30min.png') })
  })
})
