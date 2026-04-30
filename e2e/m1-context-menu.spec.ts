import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * QA-W4-T4.1: e2e for SiteContextMenu (right-click) interactions on M1 scenario.
 *
 * Strategy:
 *   The map is rendered to a <canvas>, so individual sites are not directly
 *   addressable by testid. To keep the spec deterministic and independent of
 *   pixel coordinates, we drive the context menu by calling the store's
 *   `openContextMenu` action via the dev-only `window.__game.store` debug hook
 *   (mounted in `src/ui/store/game-store.ts` under `import.meta.env.DEV`).
 *
 *   We then assert on the rendered DOM using the documented data-testids:
 *     - site-context-menu       (root)
 *     - menu-march              (label when already at war)
 *     - menu-declare-war        (label when not yet at war)
 *     - menu-army-{armyId}      (each army button)
 *
 *   Site IDs are discovered at runtime from the live world (no hardcoding).
 */

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence')

function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
}

interface RelevantSites {
  ownSite: string
  enemyAdjacent: string
  nonAdjacent: string
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
 * Discover three site IDs from the live world:
 *   1. ownSite        - any site currently owned by the player.
 *   2. enemyAdjacent  - an enemy site adjacent to a site that hosts an idle player army.
 *   3. nonAdjacent    - an enemy site that is NOT adjacent to any idle player army.
 */
async function findRelevantSites(page: Page): Promise<RelevantSites> {
  return page.evaluate(() => {
    type Army = { id: string; realmId: string; location: string; state: string }
    type Site = { id: string; ownerId: string | null; adjacency: string[] }
    type World = { playerRealmId: string; sites: Map<string, Site>; armies: Map<string, Army> }

    const game = (window as unknown as { __game: { world: () => World } }).__game
    const world = game.world()
    const playerRealmId = world.playerRealmId
    const sites = [...world.sites.values()]

    const idleArmies = [...world.armies.values()].filter(
      (a) => a.realmId === playerRealmId && a.state === 'idle',
    )

    const adjacentToArmy = new Set<string>()
    for (const army of idleArmies) {
      const armySite = world.sites.get(army.location)
      if (armySite) for (const adj of armySite.adjacency) adjacentToArmy.add(adj)
    }

    const ownSite = sites.find((s) => s.ownerId === playerRealmId)
    const adjacentEnemy = sites.find(
      (s) => adjacentToArmy.has(s.id) && s.ownerId && s.ownerId !== playerRealmId,
    )
    const nonAdjacentEnemy = sites.find(
      (s) =>
        !adjacentToArmy.has(s.id) &&
        s.ownerId &&
        s.ownerId !== playerRealmId &&
        s.id !== adjacentEnemy?.id,
    )

    if (!ownSite) throw new Error('No player-owned sites found')
    if (!adjacentEnemy) throw new Error('No adjacent enemy site found')
    if (!nonAdjacentEnemy) throw new Error('No non-adjacent enemy site found')

    return {
      ownSite: ownSite.id,
      enemyAdjacent: adjacentEnemy.id,
      nonAdjacent: nonAdjacentEnemy.id,
      playerRealmId,
    }
  })
}

async function openMenuForSite(page: Page, siteId: string): Promise<void> {
  await page.evaluate((sid) => {
    type Store = {
      getState: () => { openContextMenu: (p: { siteId: string; x: number; y: number }) => void }
    }
    const game = (window as unknown as { __game: { store: Store } }).__game
    game.store.getState().openContextMenu({ siteId: sid, x: 200, y: 200 })
  }, siteId)
}

async function declareWarBetween(page: Page, enemySiteId: string): Promise<void> {
  await page.evaluate((sid) => {
    type Site = { ownerId: string | null }
    type World = {
      playerRealmId: string
      sites: Map<string, Site>
      wars: Map<string, true>
    }
    type Store = {
      getState: () => { world: World }
      setState: (updater: (state: { world: World }) => void) => void
    }
    const game = (window as unknown as { __game: { store: Store } }).__game
    game.store.setState((state) => {
      const target = state.world.sites.get(sid)
      if (!target || !target.ownerId) return
      const newWars = new Map(state.world.wars)
      const key = [state.world.playerRealmId, target.ownerId].sort().join(':')
      newWars.set(key, true)
      state.world = { ...state.world, wars: newWars }
    })
  }, enemySiteId)
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.beforeEach(async ({ page }) => {
  await waitForApp(page)
})

test.describe('M1 SiteContextMenu — visibility', () => {
  test('state 1 — initial: no context menu in DOM', async ({ page }) => {
    await expect(page.locator('[data-testid="site-context-menu"]')).toHaveCount(0)
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.1-state-1.png') })
  })

  test('state 6 — click outside closes the menu', async ({ page }) => {
    const sites = await findRelevantSites(page)
    await openMenuForSite(page, sites.ownSite)

    const menu = page.locator('[data-testid="site-context-menu"]')
    await expect(menu).toBeVisible()

    await page.locator('[data-testid="top-bar-date"]').click()
    await expect(menu).toHaveCount(0)
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.1-state-6.png') })
  })
})

test.describe('M1 SiteContextMenu — own / unreachable sites', () => {
  test('state 2 — right-click own site: shows disabled "己方邑"', async ({ page }) => {
    const sites = await findRelevantSites(page)
    await openMenuForSite(page, sites.ownSite)

    const menu = page.locator('[data-testid="site-context-menu"]')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('己方邑')
    await expect(menu.getByRole('button', { name: /己方邑/ })).toBeDisabled()
    await expect(menu.locator('[data-testid^="menu-army-"]')).toHaveCount(0)
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.1-state-2.png') })
  })

  test('state 4 — right-click non-adjacent enemy: shows diplomacy options without army buttons', async ({ page }) => {
    const sites = await findRelevantSites(page)
    await openMenuForSite(page, sites.nonAdjacent)

    const menu = page.locator('[data-testid="site-context-menu"]')
    await expect(menu).toBeVisible()
    await expect(menu.locator('[data-testid="menu-declare-war-btn"]')).toContainText('宣战')
    await expect(menu.locator('[data-testid="menu-diplomacy-btn"]')).toContainText('外交')
    await expect(menu.locator('[data-testid^="menu-army-"]')).toHaveCount(0)
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.1-state-4.png') })
  })
})

test.describe('M1 SiteContextMenu — actionable enemy sites', () => {
  test('state 3 — adjacent enemy (not at war): shows "宣战" + "外交" entry points', async ({
    page,
  }) => {
    const sites = await findRelevantSites(page)
    await openMenuForSite(page, sites.enemyAdjacent)

    const menu = page.locator('[data-testid="site-context-menu"]')
    await expect(menu).toBeVisible()
    const declareButton = menu.locator('[data-testid="menu-declare-war-btn"]')
    await expect(declareButton).toBeVisible()
    await expect(declareButton).toContainText('宣战')
    const diplomacyButton = menu.locator('[data-testid="menu-diplomacy-btn"]')
    await expect(diplomacyButton).toBeVisible()
    await expect(diplomacyButton).toContainText('外交')
    await expect(menu.locator('[data-testid="menu-march"]')).toHaveCount(0)
    await expect(menu.locator('[data-testid^="menu-army-"]')).toHaveCount(0)
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.1-state-3.png') })
  })

  test('state 5 — adjacent enemy (already at war): shows "派兵攻击" + army buttons', async ({
    page,
  }) => {
    const sites = await findRelevantSites(page)
    await declareWarBetween(page, sites.enemyAdjacent)
    await openMenuForSite(page, sites.enemyAdjacent)

    const menu = page.locator('[data-testid="site-context-menu"]')
    await expect(menu).toBeVisible()
    const marchLabel = menu.locator('[data-testid="menu-march"]')
    await expect(marchLabel).toBeVisible()
    await expect(marchLabel).toContainText('派兵攻击')
    await expect(menu.locator('[data-testid="menu-declare-war"]')).toHaveCount(0)
    expect(await menu.locator('[data-testid^="menu-army-"]').count()).toBeGreaterThan(0)
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.1-state-5.png') })
  })
})

test.describe('M1 SiteContextMenu — bottom bar sanity', () => {
  test('state 7 — 王宫 / 军事 toggle the right panels; 外交 stays disabled', async ({ page }) => {
    await page.click('[data-testid="bottom-bar-junshi"]')
    await expect(page.locator('[data-testid="army-list-panel"]')).toBeVisible()

    await page.click('[data-testid="bottom-bar-junshi"]')
    await page.click('[data-testid="bottom-bar-wanggong"]')
    await expect(page.locator('[data-testid="realm-overview-panel"]')).toBeVisible()

    await expect(page.locator('[data-testid="bottom-bar-waijiao"]')).toBeDisabled()
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'm1-task-4.1-state-7.png') })
  })
})
