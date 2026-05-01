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

async function openDiplomacyPanel(page: Page): Promise<DiplomacyTarget> {
  const target = await findDiplomacyTarget(page)
  await seedDiplomacyFixture(page, target.realmId)
  await openMenuForSite(page, target.siteId)

  const contextMenu = page.locator('[data-testid="site-context-menu"]')
  await expect(contextMenu).toBeVisible()

  const diplomacyButton = page.locator('[data-testid="menu-diplomacy-btn"]')
  await expect(diplomacyButton).toBeVisible()
  await diplomacyButton.click()

  await expect(page.locator('[data-testid="diplomacy-panel"]')).toBeVisible()
  return target
}

async function mountPeacePanel(page: Page, targetRealmId: string): Promise<void> {
  await page.evaluate(async (realmId) => {
    const existingHost = document.querySelector('[data-testid="peace-panel-host"]')
    existingHost?.remove()

    const host = document.createElement('div')
    host.setAttribute('data-testid', 'peace-panel-host')
    document.body.appendChild(host)

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        window.removeEventListener('peace-panel-mounted', handleMounted)
        window.removeEventListener('peace-panel-mount-error', handleError as EventListener)
      }

      const handleMounted = () => {
        cleanup()
        resolve()
      }

      const handleError = (event: Event) => {
        cleanup()
        const detail = event instanceof CustomEvent ? String(event.detail) : 'unknown mount error'
        reject(new Error(detail))
      }

      window.addEventListener('peace-panel-mounted', handleMounted, { once: true })
      window.addEventListener('peace-panel-mount-error', handleError as EventListener, { once: true })

      const script = document.createElement('script')
      script.type = 'module'
      const scriptContent = `
        import React from '/node_modules/.vite/deps/react.js'
        import ReactDOMClient from '/node_modules/.vite/deps/react-dom_client.js'
        import { PeacePanel } from '/src/ui/components/PeacePanel/PeacePanel.tsx'

        const host = document.querySelector('[data-testid="peace-panel-host"]')

        try {
          ReactDOMClient.createRoot(host).render(
            React.createElement(PeacePanel, {
              targetRealmId: '__TARGET_REALM_ID__',
              onClose: () => {},
            }),
          )
          window.dispatchEvent(new CustomEvent('peace-panel-mounted'))
        } catch (error) {
          window.dispatchEvent(new CustomEvent('peace-panel-mount-error', { detail: String(error) }))
        }
      `
      script.textContent = scriptContent.replace(`'__TARGET_REALM_ID__'`, JSON.stringify(realmId))
      document.body.appendChild(script)
    })
  }, targetRealmId)
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.describe('M3 diplomacy UI evidence', () => {
  test('renders localized top bar and time controls without legacy English labels', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await waitForApp(page)

    await expect(page.locator('[data-testid="top-bar-tick-count"]')).toHaveText(/^时步：\d+$/)
    await expect(page.locator('[data-testid="top-bar-speed"]')).toContainText('暂停')
    await expect(page.locator('[data-testid="time-control-pause"]')).toHaveText('⏸ 暂停')
    await expect(page.locator('[data-testid="time-control-1x"]')).toContainText('1x')

    const body = page.locator('body')
    await expect(body).not.toContainText('Tick:')
    await expect(body).not.toContainText(/\bpause\b/)
  })

  test('opens diplomacy panel, submits envoy, and shows localized success copy', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await waitForApp(page)
    await openDiplomacyPanel(page)

    const relationSummary = page.locator('[data-testid="diplomacy-relation-summary"]')
    await expect(relationSummary).toContainText('态度: 35')
    await expect(relationSummary).toContainText('信任: 45')

    const activeTreaties = page.locator('[data-testid="diplomacy-active-treaties"]')
    await expect(activeTreaties).toContainText('e2e_truce_')
    await expect(activeTreaties).toContainText('停战期内')

    await expect(page.locator('[data-testid="diplomacy-action-envoy"]')).toHaveText('遣使')
    await expect(page.locator('[data-testid="diplomacy-action-tribute"]')).toHaveText('朝贡')
    await expect(page.locator('[data-testid="diplomacy-action-peace"]')).toHaveText('议和')

    await page.locator('[data-testid="diplomacy-action-envoy"]').click()

    const feedback = page.locator('[data-testid="diplomacy-feedback"]')
    await expect(feedback).toContainText('行动已提交：遣使')
    await expect(feedback).not.toContainText('Action submitted:')

    await page.screenshot({ path: evidence('task-8-diplomacy-ui.png') })
  })

  test('shows localized rejection copy and localized peace panel terms only', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await waitForApp(page)

    const target = await openDiplomacyPanel(page)
    await page.locator('[data-testid="diplomacy-action-declare_war"]').click()

    const feedback = page.locator('[data-testid="diplomacy-feedback"]')
    await expect(feedback).toContainText('已拒绝：停战期内不可宣战')
    await expect(feedback).not.toContainText('Rejected:')
    await expect(feedback).not.toContainText('truce_active')

    await mountPeacePanel(page, target.realmId)

    const peacePanel = page.locator('[data-testid="peace-panel"]')
    await expect(peacePanel).toBeVisible()
    await expect(peacePanel).toContainText('割让邑')
    await expect(peacePanel).toContainText('赔款')
    await expect(peacePanel).toContainText('朝贡')
    await expect(peacePanel).not.toContainText('(Cession)')
    await expect(peacePanel).not.toContainText('(Indemnity)')
    await expect(peacePanel).not.toContainText('(Tribute)')
  })
})
