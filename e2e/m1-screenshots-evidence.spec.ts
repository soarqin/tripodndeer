import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * M1 Core Loop screenshot evidence generator.
 *
 * Captures 9 PNG screenshots used as evidence for the M1 plan:
 *   - m1-task-3.1-dev-screen.png   game loaded with 50-site map
 *   - m1-task-1.8-bottombar.png    BottomBar visible with 8 buttons
 *   - m1-task-3.7-visual.png       army icons visible on map
 *   - m1-task-3.4-realtime.png     RealmOverviewPanel visible
 *   - m1-task-3.2-rightclick.png   SiteContextMenu visible
 *   - m1-task-4.2-before.png       state before conquest (army idle)
 *   - m1-task-4.2-after.png        state after conquest (site ownership flipped)
 *   - m1-task-4.3-map.png          map after AI has acted
 *   - m1-task-3.6-victory.png      victory banner "江山一统"
 *
 * One sequential test so the same browser session captures everything in order.
 * No source code changes; reuses dev-only `window.__game` hook from
 * `src/ui/store/game-store.ts`.
 */

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence')

function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
}

function evidence(name: string): string {
  return path.join(EVIDENCE_DIR, name)
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

async function waitForConquest(page: Page, target: MarchTarget): Promise<void> {
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
    { timeout: 30_000 },
  )
}

interface NearVictorySetup {
  readonly armyId: string
  readonly targetSiteId: string
  readonly playerRealmId: string
}

const ARRANGE_NEAR_VICTORY_INIT = `
  (() => {
    const game = window.__game;
    const world = game.world();
    const playerRealmId = world.playerRealmId;
    const armies = [...world.armies.values()];
    let armyId = null;
    let targetSiteId = null;
    outer: for (const army of armies) {
      if (army.realmId !== playerRealmId || army.state !== 'idle') continue;
      const armySite = world.sites.get(army.location);
      if (!armySite) continue;
      for (const adjId of armySite.adjacency) {
        const adjSite = world.sites.get(adjId);
        if (!adjSite || !adjSite.ownerId || adjSite.ownerId === playerRealmId) continue;
        const hasDefender = armies.some(
          (a) => a.location === adjId && a.realmId === adjSite.ownerId,
        );
        if (!hasDefender) {
          armyId = army.id;
          targetSiteId = adjId;
          break outer;
        }
      }
    }
    if (!armyId || !targetSiteId) {
      throw new Error('No idle player army adjacent to an undefended enemy site');
    }
    game.store.setState((state) => {
      const newSites = new Map();
      for (const [id, site] of state.world.sites) {
        newSites.set(id, id === targetSiteId ? site : { ...site, ownerId: playerRealmId });
      }
      const newArmies = new Map();
      for (const [id, army] of state.world.armies) {
        if (army.realmId === playerRealmId) newArmies.set(id, army);
      }
      state.world = { ...state.world, sites: newSites, armies: newArmies };
    });
    return { armyId, targetSiteId, playerRealmId };
  })()
`

async function arrangeNearVictoryState(page: Page): Promise<NearVictorySetup> {
  return page.evaluate(ARRANGE_NEAR_VICTORY_INIT)
}

async function setSpeedToPause(page: Page): Promise<void> {
  await page.evaluate(() => {
    type Store = { getState: () => { setSpeed: (s: 'pause' | '1x' | '2x' | '5x') => void } }
    const game = (window as unknown as { __game: { store: Store } }).__game
    game.store.getState().setSpeed('pause')
  })
}

async function resetWorld(page: Page): Promise<void> {
  await page.evaluate(() => {
    type Store = { getState: () => { reset: () => void } }
    const game = (window as unknown as { __game: { store: Store } }).__game
    game.store.getState().reset()
  })
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.describe('M1 — screenshot evidence', () => {
  test.setTimeout(120_000)

  test('captures all 9 evidence screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await waitForApp(page)

    // ----- Initial load: same screen reused for 3 evidence files -----
    await page.screenshot({ path: evidence('m1-task-3.1-dev-screen.png') })
    await page.screenshot({ path: evidence('m1-task-1.8-bottombar.png') })
    await page.screenshot({ path: evidence('m1-task-3.7-visual.png') })

    // ----- Click 王宫: RealmOverviewPanel visible -----
    await page.click('[data-testid="bottom-bar-wanggong"]')
    await expect(page.locator('[data-testid="realm-overview-panel"]')).toBeVisible()
    await page.screenshot({ path: evidence('m1-task-3.4-realtime.png') })

    // Close panel before next interactions to avoid covering the map.
    await page.click('[data-testid="bottom-bar-wanggong"]')
    await expect(page.locator('[data-testid="realm-overview-panel"]')).toHaveCount(0)

    // ----- Trigger context menu on adjacent enemy site -----
    const target = await findUndefendedAdjacentTarget(page)
    await page.evaluate(
      ({ siteId }) => {
        type Store = {
          getState: () => {
            openContextMenu: (p: { siteId: string; x: number; y: number }) => void
          }
        }
        const game = (window as unknown as { __game: { store: Store } }).__game
        game.store.getState().openContextMenu({ siteId, x: 400, y: 300 })
      },
      { siteId: target.targetSiteId },
    )
    await expect(page.locator('[data-testid="site-context-menu"]')).toBeVisible()
    await page.screenshot({ path: evidence('m1-task-3.2-rightclick.png') })

    // Close context menu.
    await page.evaluate(() => {
      type Store = { getState: () => { closeContextMenu: () => void } }
      const game = (window as unknown as { __game: { store: Store } }).__game
      game.store.getState().closeContextMenu()
    })
    await expect(page.locator('[data-testid="site-context-menu"]')).toHaveCount(0)

    // ----- BEFORE conquest -----
    await page.screenshot({ path: evidence('m1-task-4.2-before.png') })

    // ----- Issue conquest order, run engine at 5x, wait for ownership flip -----
    await issueDeclareWarAndMarch(page, target.armyId, target.targetSiteId)
    await page.click('[data-testid="time-control-5x"]')
    await waitForConquest(page, target)

    // Pause so the post-conquest screenshot is stable.
    await setSpeedToPause(page)
    await page.screenshot({ path: evidence('m1-task-4.2-after.png') })

    // ----- AI behavior: 10 more seconds at 5x so non-player realms act -----
    await page.click('[data-testid="time-control-5x"]')
    await page.waitForTimeout(10_000)
    await setSpeedToPause(page)
    await page.screenshot({ path: evidence('m1-task-4.3-map.png') })

    // ----- Reset and arrange near-victory, conquer last enemy, capture banner -----
    await resetWorld(page)
    // After reset, RAF loop continues; force pause again to land cleanly.
    await setSpeedToPause(page)
    // Re-wait briefly so the view re-renders the fresh world before fixture setup.
    await page.waitForFunction(
      () => {
        const game = (
          window as unknown as { __game?: { world: () => { sites: Map<string, unknown> } } }
        ).__game
        return Boolean(game && game.world && game.world().sites && game.world().sites.size > 0)
      },
      null,
      { timeout: 10_000 },
    )

    const setup = await arrangeNearVictoryState(page)
    await issueDeclareWarAndMarch(page, setup.armyId, setup.targetSiteId)
    await page.click('[data-testid="time-control-5x"]')

    // Wait for conquest of the final enemy site.
    await page.waitForFunction(
      ({ siteId, playerRealmId }) => {
        type Site = { id: string; ownerId: string | null }
        type World = { sites: Map<string, Site> }
        const game = (window as unknown as { __game?: { world: () => World } }).__game
        if (!game) return false
        const site = game.world().sites.get(siteId)
        return site?.ownerId === playerRealmId
      },
      { siteId: setup.targetSiteId, playerRealmId: setup.playerRealmId },
      { timeout: 30_000 },
    )

    const banner = page.locator('[data-testid="demo-complete"]')
    await expect(banner).toBeVisible({ timeout: 10_000 })
    await expect(banner).toContainText('江山一统')
    await page.screenshot({ path: evidence('m1-task-3.6-victory.png') })
  })
})
