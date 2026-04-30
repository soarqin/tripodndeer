import { test, expect } from '@playwright/test'

type TestGameStore = typeof import('~/ui/store')['useGameStore']
type TestStoreState = ReturnType<TestGameStore['getState']>
type TestWorld = TestStoreState['world']

type TestGame = {
  world: () => TestWorld
  store: TestGameStore
}

type TestArmyKey = TestWorld['armies'] extends ReadonlyMap<infer Key, unknown> ? Key : never
type TestArmyValue = TestWorld['armies'] extends ReadonlyMap<unknown, infer Army> ? Army : never

declare global {
  interface Window {
    __game?: TestGame
  }
}

// M1: Victory requires player-agency conquest (not auto-conquest like M0).
// This spec verifies the demo-complete banner appears after player conquers all sites.
// Uses the same near-victory fixture pattern as m1-victory.spec.ts.
test.describe('QA-FUNC-1: Victory banner appears after player conquers all sites', () => {
  test.setTimeout(60_000)

  test('demo-complete banner shows 江山一统 after near-victory conquest', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="bottom-bar-wanggong"]', { timeout: 10000 })
    await page.waitForFunction(
      () => {
        const game = window.__game
        return Boolean(game && game.world && game.world().sites && game.world().sites.size > 0)
      },
      null,
      { timeout: 10000 },
    )

    // Arrange near-victory: flip all sites to player except one undefended adjacent enemy
    const setup = await page.evaluate(() => {
      const game = window.__game
      if (!game) throw new Error('Game not ready')
      const world = game.world()
      const playerRealmId = world.playerRealmId
      const armies = [...world.armies.values()]
      let armyId: string | null = null
      let targetSiteId: string | null = null
      outer: for (const army of armies) {
        if (army.realmId !== playerRealmId || army.state !== 'idle') continue
        const armySite = world.sites.get(army.location)
        if (!armySite) continue
        for (const adjId of armySite.adjacency) {
          const adjSite = world.sites.get(adjId)
          if (!adjSite || !adjSite.ownerId || adjSite.ownerId === playerRealmId) continue
          const hasDefender = armies.some(a => a.location === adjId && a.realmId === adjSite.ownerId)
          if (!hasDefender) {
            armyId = army.id
            targetSiteId = adjId
            break outer
          }
        }
      }
      const confirmedArmyId = armyId
      const confirmedTargetSiteId = targetSiteId
      if (!confirmedArmyId || !confirmedTargetSiteId) throw new Error('No idle army adjacent to undefended enemy')
      game.store.setState(state => {
        const newSites = new Map(state.world.sites)
        for (const [id, site] of state.world.sites) {
          newSites.set(id, id === confirmedTargetSiteId ? site : { ...site, ownerId: playerRealmId })
        }
        const newArmies = new Map<TestArmyKey, TestArmyValue>()
        for (const [id, army] of state.world.armies) {
          if (army.realmId === playerRealmId) newArmies.set(id, army)
        }
        state.world = { ...state.world, sites: newSites, armies: newArmies }
      })
      return { armyId: confirmedArmyId, targetSiteId: confirmedTargetSiteId, playerRealmId }
    })

    // Issue conquest order
    await page.evaluate(
      ({ aId, tId }) => {
        const game = window.__game
        if (!game) throw new Error('Game not ready')
        game.store.getState().issueOrder({ type: 'declareWarAndMarch', armyId: aId, targetSiteId: tId })
      },
      { aId: setup.armyId, tId: setup.targetSiteId },
    )

    // Run engine at 5x speed
    await page.click('[data-testid="time-control-5x"]').catch(() => {})

    // Wait for conquest
    await page.waitForFunction(
      ({ siteId, playerRealmId }) => {
        const game = window.__game
        if (!game) return false
        const site = game.world().sites.get(siteId)
        return site?.ownerId === playerRealmId
      },
      { siteId: setup.targetSiteId, playerRealmId: setup.playerRealmId },
      { timeout: 30_000 },
    )

    // Verify victory banner
    await expect(page.locator('[data-testid="demo-complete"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="demo-complete"]')).toContainText('江山一统')
  })
})
