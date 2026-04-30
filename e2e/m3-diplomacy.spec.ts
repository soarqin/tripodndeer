import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence')

function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
}

function evidence(name: string): string {
  return path.join(EVIDENCE_DIR, name)
}

interface DiplomacyTarget {
  readonly siteId: string
  readonly realmId: string
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

async function findDiplomacyTarget(page: Page): Promise<DiplomacyTarget> {
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

    const idlePlayerArmies = [...world.armies.values()].filter(
      (army) => army.realmId === world.playerRealmId && army.state === 'idle',
    )

    for (const army of idlePlayerArmies) {
      const armySite = world.sites.get(army.location)
      if (!armySite) continue

      for (const adjacentSiteId of armySite.adjacency) {
        const targetSite = world.sites.get(adjacentSiteId)
        if (!targetSite?.ownerId || targetSite.ownerId === world.playerRealmId) continue
        return { siteId: targetSite.id, realmId: targetSite.ownerId }
      }
    }

    throw new Error('No adjacent diplomacy target found for the player realm')
  })
}

async function seedDiplomacyFixture(page: Page, targetRealmId: string): Promise<void> {
  await page.evaluate((realmId) => {
    type GameDate = { yearBC: number; season: 'spring' | 'summer' | 'autumn' | 'winter'; month: 1 | 2 | 3; xun: 'shang' | 'zhong' | 'xia' }
    type Relation = {
      key: string
      realmAId: string
      realmBId: string
      attitude: number
      trust: number
      updatedAt: GameDate
    }
    type Treaty = {
      id: string
      kind: 'truce'
      realmAId: string
      realmBId: string
      status: 'active'
      signedAt: GameDate
      signedAtTick: number
      expiresAt: GameDate
      expiresAtTick: number
      endedAt: null
      endedAtTick: null
      sourceProposalId: null
    }
    type Store = {
      setState: (updater: (state: { world: { playerRealmId: string; date: GameDate; tick: number; relations: Map<string, Relation>; treaties: Map<string, Treaty> }; diplomacyFeedback: readonly unknown[]; diplomacyTargetRealmId: string | null; clockState: { speed: 'pause' | '1x' | '2x' | '3x' | '4x' | '5x' } }) => void) => void
    }

    const relationKey = (a: string, b: string) => [a, b].sort((left, right) => left.localeCompare(right)).join('__')
    const game = (window as unknown as { __game: { store: Store } }).__game

    game.store.setState((state) => {
      const playerRealmId = state.world.playerRealmId
      const key = relationKey(playerRealmId, realmId)
      const relations = new Map(state.world.relations)
      const treaties = new Map(state.world.treaties)
      const treatyId = `e2e_truce_${key}`

      relations.set(key, {
        key,
        realmAId: key.split('__')[0]!,
        realmBId: key.split('__')[1]!,
        attitude: 35,
        trust: 45,
        updatedAt: state.world.date,
      })

      treaties.set(treatyId, {
        id: treatyId,
        kind: 'truce',
        realmAId: playerRealmId,
        realmBId: realmId,
        status: 'active',
        signedAt: state.world.date,
        signedAtTick: state.world.tick,
        expiresAt: state.world.date,
        expiresAtTick: state.world.tick + 12,
        endedAt: null,
        endedAtTick: null,
        sourceProposalId: null,
      })

      state.world = {
        ...state.world,
        relations,
        treaties,
      }
      state.clockState = { ...state.clockState, speed: 'pause' }
      state.diplomacyFeedback = []
      state.diplomacyTargetRealmId = null
    })
  }, targetRealmId)
}

async function openMenuForSite(page: Page, siteId: string): Promise<void> {
  await page.evaluate((targetSiteId) => {
    type Store = {
      getState: () => { openContextMenu: (payload: { siteId: string; x: number; y: number }) => void }
    }

    const game = (window as unknown as { __game: { store: Store } }).__game
    game.store.getState().openContextMenu({ siteId: targetSiteId, x: 320, y: 240 })
  }, siteId)
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.describe('M3 diplomacy UI evidence', () => {
  test('opens diplomacy panel, submits envoy, and captures evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await waitForApp(page)

    const target = await findDiplomacyTarget(page)
    await seedDiplomacyFixture(page, target.realmId)
    await openMenuForSite(page, target.siteId)

    const contextMenu = page.locator('[data-testid="site-context-menu"]')
    await expect(contextMenu).toBeVisible()

    const diplomacyButton = page.locator('[data-testid="menu-diplomacy-btn"]')
    await expect(diplomacyButton).toBeVisible()
    await diplomacyButton.click()

    const panel = page.locator('[data-testid="diplomacy-panel"]')
    await expect(panel).toBeVisible()
    await expect(page.locator('[data-testid="diplomacy-relation-summary"]')).toContainText('态度: 35')
    await expect(page.locator('[data-testid="diplomacy-relation-summary"]')).toContainText('信任: 45')

    const activeTreaties = page.locator('[data-testid="diplomacy-active-treaties"]')
    await expect(activeTreaties).toContainText('e2e_truce_')
    await expect(activeTreaties).toContainText('停战期内')

    await page.locator('[data-testid="diplomacy-action-envoy"]').click()

    const feedback = page.locator('[data-testid="diplomacy-feedback"]')
    await expect(feedback).toContainText('Action submitted: envoy')
    await expect(feedback).toContainText('最新状态: submitted')

    await page.screenshot({ path: evidence('task-10-diplomacy-ui.png') })
  })
})
