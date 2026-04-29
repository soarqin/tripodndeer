import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * QA-W4-T4.3: e2e for M1 AI behavior observability.
 *
 * Verifies that:
 *   1. AI realms take observable actions (declare wars and/or dispatch armies)
 *      within ~60 seconds of real time at 5x speed.
 *   2. Every AI army dispatch targets a site adjacent to the dispatch source
 *      (the AI must never march across non-adjacent sites).
 *
 * Strategy mirrors `m1-context-menu.spec.ts` / `m1-march-conquest.spec.ts`:
 *   The map is rendered to <canvas>, so we drive everything via the dev-only
 *   `window.__game.{store,world}` debug hook (mounted in
 *   `src/ui/store/game-store.ts` under `import.meta.env.DEV`). No hardcoded
 *   realm or site IDs, no fake timers, no AI mocks — we wait on real engine
 *   ticks at 5x (400ms/tick, AI fires every 3 ticks ≈ 1.2s).
 *
 * Adjacency invariant (test 2):
 *   Most M1 edges have `travel_cost=1`, so the AI's dispatch + march + combat
 *   can resolve in a SINGLE engine tick — by the time a store subscriber
 *   fires, the army has already returned to `idle`. We therefore tap into
 *   zustand's `(state, prevState)` subscription and inspect the per-tick
 *   `events` array for `aiDispatchedArmy` events, looking up each dispatched
 *   army's location in `prevState.world` (i.e. before the AI plan phase ran)
 *   to determine the true dispatch source. The contract verified here mirrors
 *   `findCandidateTargets` in `src/engine/systems/ai/ai.ts`.
 */

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence')

interface AiDispatchObservation {
  readonly armyId: string
  readonly realmId: string
  readonly prevLocation: string | null
  readonly targetSiteId: string
  readonly adjacencyHasTarget: boolean
}

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

async function setSpeed5x(page: Page): Promise<void> {
  await page.click('[data-testid="time-control-5x"]')
}

async function getInitialWarCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    type World = { wars: Map<string, true> }
    const game = (window as unknown as { __game: { world: () => World } }).__game
    return game.world().wars.size
  })
}

async function waitForAnyAiAction(page: Page, timeoutMs: number): Promise<void> {
  await page.waitForFunction(
    () => {
      type Army = { realmId: string; state: string }
      type World = {
        playerRealmId: string
        armies: Map<string, Army>
        wars: Map<string, true>
      }
      const game = (window as unknown as { __game?: { world: () => World } }).__game
      if (!game) return false
      const world = game.world()
      if (world.wars.size > 0) return true
      for (const army of world.armies.values()) {
        if (army.realmId !== world.playerRealmId && army.state === 'marching') return true
      }
      return false
    },
    null,
    { timeout: timeoutMs },
  )
}

async function getAiActionSummary(page: Page): Promise<{
  tick: number
  warsSize: number
  aiMarchingArmies: number
}> {
  return page.evaluate(() => {
    type Army = { realmId: string; state: string }
    type World = {
      playerRealmId: string
      armies: Map<string, Army>
      wars: Map<string, true>
      tick: number
    }
    const game = (window as unknown as { __game: { world: () => World } }).__game
    const world = game.world()
    let aiMarching = 0
    for (const army of world.armies.values()) {
      if (army.realmId !== world.playerRealmId && army.state === 'marching') aiMarching += 1
    }
    return { tick: world.tick, warsSize: world.wars.size, aiMarchingArmies: aiMarching }
  })
}

// Browser-side observer body, kept as a string so the function we install via
// `page.evaluate` lives in the page context but is short here in the spec.
const AI_DISPATCH_OBSERVER_INIT = `
  (() => {
    const game = window.__game;
    const observations = [];
    window.__aiObservations = observations;
    const onChange = (state, prevState) => {
      for (const ev of state.events) {
        if (ev.type !== 'aiDispatchedArmy') continue;
        const prevArmy = prevState.world.armies.get(ev.payload.armyId);
        const prevLocation = prevArmy ? prevArmy.location : null;
        const prevSite = prevLocation ? prevState.world.sites.get(prevLocation) : undefined;
        observations.push({
          armyId: ev.payload.armyId,
          realmId: ev.payload.realmId,
          prevLocation,
          targetSiteId: ev.payload.targetSiteId,
          adjacencyHasTarget: !!prevSite && prevSite.adjacency.includes(ev.payload.targetSiteId),
        });
      }
    };
    window.__aiUnsub = game.store.subscribe(onChange);
  })();
`

async function installAiDispatchObserver(page: Page): Promise<void> {
  await page.evaluate(AI_DISPATCH_OBSERVER_INIT)
}

async function waitForAnyAiDispatchObservation(page: Page, timeoutMs: number): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const obs = (window as unknown as { __aiObservations?: unknown[] }).__aiObservations
        return Boolean(obs && obs.length > 0)
      },
      null,
      { timeout: timeoutMs },
    )
    .catch(() => {
      /* fall through — assertion below will surface the failure */
    })
}

async function collectAiDispatchObservations(page: Page): Promise<AiDispatchObservation[]> {
  return page.evaluate(() => {
    const obs = (window as unknown as { __aiObservations?: AiDispatchObservation[] })
      .__aiObservations
    const unsub = (window as unknown as { __aiUnsub?: () => void }).__aiUnsub
    if (unsub) unsub()
    return obs ?? []
  })
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.beforeEach(async ({ page }) => {
  await waitForApp(page)
})

test.describe('M1 AI Behavior — observability', () => {
  test('AI declares wars or dispatches armies within 60s at 5x speed', async ({ page }) => {
    test.setTimeout(90000)

    // A fresh M1 world has no wars unless the player has declared one — and
    // we have not. AI fires every 3 ticks (≈ 1.2s at 5x), with 20% chance
    // per non-player realm per fire, so over 60s we expect dozens of rolls
    // — well above any "no observable activity" noise floor.
    expect(await getInitialWarCount(page)).toBe(0)

    await setSpeed5x(page)
    await waitForAnyAiAction(page, 60000)

    const summary = await getAiActionSummary(page)
    expect(summary.warsSize + summary.aiMarchingArmies).toBeGreaterThan(0)
    expect(summary.tick).toBeGreaterThan(0)
  })

  test('AI armies are only dispatched to adjacent sites', async ({ page }) => {
    test.setTimeout(90000)

    await installAiDispatchObserver(page)
    await setSpeed5x(page)
    await waitForAnyAiDispatchObservation(page, 60000)
    const observations = await collectAiDispatchObservations(page)

    expect(
      observations.length,
      'expected at least one AI dispatch event within 60s at 5x speed',
    ).toBeGreaterThan(0)

    const violations = observations.filter((o) => !o.adjacencyHasTarget)
    expect(
      violations,
      `AI armies must only be dispatched to adjacent sites; violations: ${JSON.stringify(violations)}`,
    ).toEqual([])

    test.info().annotations.push({
      type: 'observed',
      description: `aiDispatchEvents=${observations.length}`,
    })

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.3-ai-behavior.png') })
  })
})
