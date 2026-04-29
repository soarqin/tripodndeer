import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * QA-W4-T4.4: e2e for the M1 victory condition (江山一统).
 *
 * Verifies that:
 *   1. The "江山一统" banner (data-testid="demo-complete") is NOT visible
 *      while at least one site is owned by another realm.
 *   2. The banner appears once the player owns every site, and that the
 *      transition is driven by REAL combat — i.e. the player conquers the
 *      final remaining enemy site via `declareWarAndMarch`, not by directly
 *      forcing the banner into the DOM.
 *
 * Strategy:
 *   The M1 world starts with seven realms. Running 6 realms to extinction
 *   organically would take many in-game minutes and is covered by the
 *   playthrough spec; this test instead arranges a deterministic "near-victory"
 *   fixture by:
 *
 *     a. Discovering an idle player army adjacent to an UNDEFENDED enemy site
 *        (so combat resolves immediately with no defender bonus).
 *     b. Reassigning EVERY OTHER site to the player realm via the dev-only
 *        store hook, leaving only the one adjacent target site enemy-owned.
 *     c. Issuing `declareWarAndMarch` and asserting the banner appears once
 *        combat resolves.
 *
 *   This exercises the real victory check pathway in `src/App.tsx` (which
 *   subscribes to `world` and renders the banner via `isVictorious(world)`).
 *
 *   No fake timers, no banner-mocking, no skipping combat.
 */

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence')

interface NearVictorySetup {
  readonly armyId: string
  readonly targetSiteId: string
  readonly playerRealmId: string
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

// Browser-side helper kept as a string so the function we install via
// `page.evaluate` lives in the page context but is short here in the spec.
//
// We must also strip every non-player army from the world: leaving them in
// place would let the AI dispatch them to flip player sites back during the
// few ticks the player needs to conquer the final enemy site (the AI's
// `findCandidateTargets` happily picks player-owned adjacencies — see
// `src/engine/systems/ai/ai.ts`). The exception is the chosen target army
// itself, which must remain alive so the player can march it.
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

/**
 * Arrange near-victory state:
 *   - find an idle player army adjacent to an UNDEFENDED enemy site,
 *   - flip every site EXCEPT that adjacent target to player ownership.
 *
 * Returns the army + target site IDs so the spec can issue the conquest order.
 */
async function arrangeNearVictoryState(page: Page): Promise<NearVictorySetup> {
  return page.evaluate(ARRANGE_NEAR_VICTORY_INIT)
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

test.describe('M1 Victory — 江山一统 banner', () => {
  // Engine ticks at 400 ms (5x); orderApply (1) + march (≤2) + combat (1) +
  // React re-render bound is comfortably under 30s, but allow headroom.
  test.setTimeout(60_000)

  test('banner appears only after the player conquers the final enemy site', async ({ page }) => {
    await waitForApp(page)

    const banner = page.locator('[data-testid="demo-complete"]')

    // Sanity: a fresh M1 world has multiple realms, banner must not be present.
    await expect(banner).toHaveCount(0)

    const setup = await arrangeNearVictoryState(page)

    // Fixture sanity: setting up near-victory must NOT trigger the banner —
    // one enemy site is still standing, so isVictorious(world) === false.
    await expect(banner).toHaveCount(0)

    await issueDeclareWarAndMarch(page, setup.armyId, setup.targetSiteId)

    // Run the engine; orderApply -> march -> combat will resolve in a few ticks.
    await page.click('[data-testid="time-control-5x"]')

    // Wait for the conquest to resolve in the world model.
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

    // Banner must now be visible and contain the victory text.
    await expect(banner).toBeVisible({ timeout: 10_000 })
    await expect(banner).toContainText('江山一统')

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.4-victory.png') })
  })
})
