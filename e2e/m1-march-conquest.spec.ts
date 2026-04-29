import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * QA-W4-T4.2: e2e for the M1 march and conquest flow.
 *
 * Verifies that:
 *   1. A player can issue `declareWarAndMarch` via the store and the army
 *      transitions to `marching` state once the orderApply phase runs.
 *   2. Running the engine at 5x speed actually conquers the targeted enemy site
 *      (site.ownerId flips to the player realm) end-to-end.
 *
 * Strategy mirrors `m1-context-menu.spec.ts`:
 *   The map is rendered to <canvas>, so individual sites are not addressable
 *   by testid. We drive the store via the dev-only `window.__game.{store,world}`
 *   debug hook (mounted in `src/ui/store/game-store.ts` under
 *   `import.meta.env.DEV`). Site / army IDs are discovered at runtime — no
 *   hardcoded IDs, no pixel coordinates, no fake timers.
 *
 *   To keep combat deterministic we target an enemy site that has NO defending
 *   army (defender +30% bonus would otherwise let a 5000 vs 5000 attack lose).
 */

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence')

function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
}

interface MarchTarget {
  armyId: string
  sourceSiteId: string
  targetSiteId: string
  playerRealmId: string
}

async function waitForApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForSelector('[data-testid="bottom-bar-wanggong"]', { timeout: 10000 })
  // Wait until the dev debug hook is mounted and the world has sites loaded.
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

/**
 * Find an idle player army adjacent to an UNDEFENDED enemy site.
 * "Undefended" = no enemy army of the same realm is currently at that site,
 * so the attacker auto-wins (combat resolves with 0 defenders).
 */
async function findUndefendedAdjacentTarget(page: Page): Promise<MarchTarget> {
  return page.evaluate(() => {
    type Army = { id: string; realmId: string; location: string; state: string }
    type Site = { id: string; ownerId: string | null; adjacency: string[] }
    type World = {
      playerRealmId: string
      sites: Map<string, Site>
      armies: Map<string, Army>
    }
    const game = (window as unknown as { __game: { world: () => World } }).__game
    const world = game.world()
    const playerRealmId = world.playerRealmId
    const armies = [...world.armies.values()]
    const sites = world.sites

    for (const army of armies) {
      if (army.realmId !== playerRealmId || army.state !== 'idle') continue
      const armySite = sites.get(army.location)
      if (!armySite) continue

      for (const adjId of armySite.adjacency) {
        const adjSite = sites.get(adjId)
        if (!adjSite) continue
        if (!adjSite.ownerId || adjSite.ownerId === playerRealmId) continue

        const hasDefender = armies.some(
          (a) => a.location === adjId && a.realmId === adjSite.ownerId,
        )
        if (!hasDefender) {
          return {
            armyId: army.id,
            sourceSiteId: armySite.id,
            targetSiteId: adjId,
            playerRealmId,
          }
        }
      }
    }
    throw new Error('No idle player army adjacent to an undefended enemy site found')
  })
}

async function issueDeclareWarAndMarch(
  page: Page,
  armyId: string,
  targetSiteId: string,
): Promise<void> {
  await page.evaluate(
    ({ aId, tId }) => {
      type Order = { type: 'declareWarAndMarch'; armyId: string; targetSiteId: string }
      type Store = { getState: () => { issueOrder: (order: Order) => void } }
      const game = (window as unknown as { __game: { store: Store } }).__game
      game.store
        .getState()
        .issueOrder({ type: 'declareWarAndMarch', armyId: aId, targetSiteId: tId })
    },
    { aId: armyId, tId: targetSiteId },
  )
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.beforeEach(async ({ page }) => {
  await waitForApp(page)
})

test.describe('M1 March and Conquest', () => {
  test('player order transitions army to marching state', async ({ page }) => {
    test.setTimeout(30000)

    const target = await findUndefendedAdjacentTarget(page)
    await issueDeclareWarAndMarch(page, target.armyId, target.targetSiteId)

    // Run engine ticks: pendingOrders are consumed during the orderApply phase.
    await page.click('[data-testid="time-control-5x"]')

    // Wait for the engine to PROCESS the order. With travel_cost=1 + 5x speed,
    // the marching window is very brief (~400ms), so we accept either:
    //   (a) army currently marching, OR
    //   (b) army already moved away from its source site (post-combat).
    await page.waitForFunction(
      ({ armyId, sourceSiteId }) => {
        type Army = { id: string; location: string; state: string }
        type World = { armies: Map<string, Army> }
        const game = (window as unknown as { __game?: { world: () => World } }).__game
        if (!game) return false
        const army = game.world().armies.get(armyId)
        if (!army) return true
        return army.state === 'marching' || army.location !== sourceSiteId
      },
      { armyId: target.armyId, sourceSiteId: target.sourceSiteId },
      { timeout: 15000 },
    )

    const result = await page.evaluate(
      ({ armyId, sourceSiteId, targetSiteId, playerRealmId }) => {
        type Army = { id: string; location: string; state: string }
        type Site = { id: string; ownerId: string | null }
        type World = {
          armies: Map<string, Army>
          sites: Map<string, Site>
        }
        const game = (window as unknown as { __game: { world: () => World } }).__game
        const world = game.world()
        const army = world.armies.get(armyId)
        const target = world.sites.get(targetSiteId)
        return {
          armyExists: Boolean(army),
          armyState: army?.state ?? null,
          armyLocation: army?.location ?? null,
          targetOwner: target?.ownerId ?? null,
          conquered: target?.ownerId === playerRealmId,
          marchedOff: army ? army.location !== sourceSiteId || army.state === 'marching' : false,
        }
      },
      target,
    )

    expect(result.armyExists).toBe(true)
    expect(result.marchedOff || result.conquered).toBe(true)
  })

  test('army conquers undefended enemy site at 5x speed', async ({ page }) => {
    // Travel cost ≤ 2, 5x = 400ms/tick: orderApply (1) + march (≤2) + combat (1)
    // ≈ 1.6s of in-engine time. Real-time pending-RAF accounting: leave ample
    // headroom so tab-throttling / CI variance doesn't flake the test.
    test.setTimeout(60000)

    const target = await findUndefendedAdjacentTarget(page)
    await issueDeclareWarAndMarch(page, target.armyId, target.targetSiteId)

    await page.click('[data-testid="time-control-5x"]')

    await page.waitForFunction(
      ({ siteId, playerRealmId }) => {
        type Site = { id: string; ownerId: string | null }
        type World = { sites: Map<string, Site> }
        const game = (window as unknown as { __game?: { world: () => World } }).__game
        if (!game) return false
        const site = game.world().sites.get(siteId)
        return site?.ownerId === playerRealmId
      },
      { siteId: target.targetSiteId, playerRealmId: target.playerRealmId },
      { timeout: 30000 },
    )

    const finalOwner = await page.evaluate((siteId) => {
      type Site = { id: string; ownerId: string | null }
      type World = { sites: Map<string, Site> }
      const game = (window as unknown as { __game: { world: () => World } }).__game
      return game.world().sites.get(siteId)?.ownerId ?? null
    }, target.targetSiteId)

    expect(finalOwner).toBe(target.playerRealmId)

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.2-conquest.png') })
  })
})
