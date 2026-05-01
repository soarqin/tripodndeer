import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { waitForApp } from './fixtures/test-helpers'

const EVIDENCE_DIR = path.join(process.cwd(), '.sisyphus/evidence')
const EVIDENCE_SCREENSHOT = path.join(EVIDENCE_DIR, 'task-10-m4-loop.png')

interface DebugOrderActivateEdict {
  readonly type: 'activate-edict'
  readonly edictId: string
  readonly realmId: string
  readonly kind: string
  readonly durationMonths: number
}

interface DebugOrderAssignGovernor {
  readonly type: 'assign-governor'
  readonly siteId: string
  readonly generalId: string
}

interface DebugEdictState {
  readonly id: string
  readonly realmId: string
  readonly kind: string
  readonly remainingMonths: number
  readonly status: string
}

interface DebugGovernorAssignment {
  readonly siteId: string
  readonly realmId: string
  readonly generalId: string
  readonly modifierKind: string
}

interface DebugEconomySettlementEvent {
  readonly type: 'economySettlement'
  readonly payload: {
    readonly realmId: string
    readonly treasuryDelta: number
    readonly foodStoresDelta: number
    readonly populationDelta: number
    readonly householdsDelta: number
    readonly settledAtTick: number
  }
}

interface DebugSnapshot {
  readonly tick: number
  readonly date: {
    readonly yearBC: number
    readonly season: string
    readonly month: number
    readonly xun: string
  }
  readonly playerRealmId: string
  readonly playerEconomy: {
    readonly treasury: number
    readonly foodStores: number
    readonly taxRate: number
  }
  readonly playerOwnedSiteTotals: {
    readonly population: number
    readonly households: number
  }
  readonly assignedGovernorSiteEconomy: {
    readonly siteId: string
    readonly population: number
    readonly households: number
    readonly taxBase: number
    readonly foodProduction: number
  } | null
  readonly pendingOrders: readonly (DebugOrderActivateEdict | DebugOrderAssignGovernor)[]
  readonly activeEdicts: readonly DebugEdictState[]
  readonly governorAssignments: readonly DebugGovernorAssignment[]
  readonly economyEvents: readonly DebugEconomySettlementEvent[]
}

function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
}

async function readDebugSnapshot(page: Page): Promise<DebugSnapshot> {
  return page.evaluate(() => {
    type Order = {
      readonly type: string
      readonly edictId?: string
      readonly realmId?: string
      readonly kind?: string
      readonly durationMonths?: number
      readonly siteId?: string
      readonly generalId?: string
    }

    type GameEvent = {
      readonly type: string
      readonly payload: unknown
    }

    type StoreState = {
      readonly world: {
        readonly tick: number
        readonly date: {
          readonly yearBC: number
          readonly season: string
          readonly month: number
          readonly xun: string
        }
        readonly playerRealmId: string
        readonly realms: ReadonlyMap<string, {
          readonly economy: {
            readonly treasury: number
            readonly foodStores: number
            readonly taxRate: number
          }
        }>
        readonly sites: ReadonlyMap<string, {
          readonly id: string
          readonly ownerId: string | null
          readonly economy: {
            readonly population: number
            readonly households: number
            readonly taxBase: number
            readonly foodProduction: number
          }
        }>
        readonly pendingOrders: readonly Order[]
        readonly edicts: ReadonlyMap<string, {
          readonly id: string
          readonly realmId: string
          readonly kind: string
          readonly remainingMonths: number
          readonly status: string
        }>
        readonly governorAssignments: ReadonlyMap<string, {
          readonly siteId: string
          readonly realmId: string
          readonly generalId: string
          readonly modifierKind: string
        }>
      }
      readonly events: readonly GameEvent[]
      setSpeed: (speed: 'pause' | '5x') => void
      tick: (deltaMs: number) => void
    }

    const game = (window as unknown as { __game: { store: { getState: () => StoreState } } }).__game
    const state = game.store.getState()
    const world = state.world
    const playerEconomy = world.realms.get(world.playerRealmId)?.economy ?? {
      treasury: 0,
      foodStores: 0,
      taxRate: 0,
    }
    const playerOwnedSiteTotals = [...world.sites.values()].reduce(
      (totals, site) => {
        if (site.ownerId !== world.playerRealmId) return totals
        return {
          population: totals.population + site.economy.population,
          households: totals.households + site.economy.households,
        }
      },
      { population: 0, households: 0 },
    )
    const assignedGovernorSite = [...world.governorAssignments.values()][0]
    const assignedGovernorSiteEconomy = assignedGovernorSite
      ? (() => {
        const site = world.sites.get(assignedGovernorSite.siteId)
        if (!site) return null
        return {
          siteId: site.id,
          population: site.economy.population,
          households: site.economy.households,
          taxBase: site.economy.taxBase,
          foodProduction: site.economy.foodProduction,
        }
      })()
      : null

    return {
      tick: world.tick,
      date: world.date,
      playerRealmId: world.playerRealmId,
      playerEconomy,
      playerOwnedSiteTotals,
      assignedGovernorSiteEconomy,
      pendingOrders: world.pendingOrders.map((order) => {
        if (order.type === 'activate-edict') {
          return {
            type: order.type,
            edictId: order.edictId ?? '',
            realmId: order.realmId ?? '',
            kind: order.kind ?? '',
            durationMonths: order.durationMonths ?? 0,
          }
        }

        if (order.type === 'assign-governor') {
          return {
            type: order.type,
            siteId: order.siteId ?? '',
            generalId: order.generalId ?? '',
          }
        }

        return {
          type: 'assign-governor' as const,
          siteId: '',
          generalId: '',
        }
      }),
      activeEdicts: [...world.edicts.values()],
      governorAssignments: [...world.governorAssignments.values()],
      economyEvents: state.events.filter(
        (event): event is DebugEconomySettlementEvent => event.type === 'economySettlement',
      ),
    }
  })
}

async function advanceExactlyOneTick(page: Page): Promise<void> {
  await page.evaluate(() => {
    type StoreState = {
      setSpeed: (speed: 'pause' | '5x') => void
      tick: (deltaMs: number) => void
    }

    const game = (window as unknown as { __game: { store: { getState: () => StoreState } } }).__game
    const state = game.store.getState()
    state.setSpeed('5x')
    state.tick(400)
    state.setSpeed('pause')
  })
}

test.beforeAll(() => {
  ensureEvidenceDir()
})

test.describe('M4 economy player loop', () => {
  test('activates tax relief, settles monthly economy, and assigns a governor deterministically', async ({ page }) => {
    await waitForApp(page)
    await page.getByTestId('bottom-bar-neizheng').click()

    const panel = page.getByTestId('economy-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('M4 Economy')
    await expect(panel).toContainText('1,000')
    await expect(panel).toContainText('2,000')
    await expect(panel).toContainText('10%')
    await expect(panel).toContainText('120,000')
    await expect(panel).toContainText('24,000')

    const initialSnapshot = await readDebugSnapshot(page)
    expect(initialSnapshot.tick).toBe(0)
    expect(initialSnapshot.date.xun).toBe('shang')
    expect(initialSnapshot.pendingOrders).toEqual([])

    await page.getByRole('button', { name: 'Activate Tax Relief' }).click()
    await page.getByLabel('Select Site').selectOption({ label: '咸阳' })
    await page.getByLabel('Select General').selectOption({ label: '白起' })
    await page.getByRole('button', { name: 'Assign Governor' }).click()

    const queuedSnapshot = await readDebugSnapshot(page)
    expect(queuedSnapshot.pendingOrders).toHaveLength(2)
    expect(queuedSnapshot.pendingOrders[0]).toMatchObject({
      type: 'activate-edict',
      realmId: queuedSnapshot.playerRealmId,
      kind: 'edict_tax_relief',
      durationMonths: 3,
    })
    expect(queuedSnapshot.pendingOrders[1]).toMatchObject({
      type: 'assign-governor',
    })

    await advanceExactlyOneTick(page)

    const settledSnapshot = await readDebugSnapshot(page)
    expect(settledSnapshot.tick).toBe(1)
    expect(settledSnapshot.date.xun).toBe('zhong')
    expect(settledSnapshot.pendingOrders).toEqual([])
    expect(settledSnapshot.activeEdicts).toEqual([
      expect.objectContaining({
        id: (queuedSnapshot.pendingOrders[0] as DebugOrderActivateEdict).edictId,
        realmId: queuedSnapshot.playerRealmId,
        kind: 'edict_tax_relief',
        remainingMonths: 2,
        status: 'active',
      }),
    ])
    expect(settledSnapshot.governorAssignments).toEqual([
      expect.objectContaining({
        siteId: (queuedSnapshot.pendingOrders[1] as DebugOrderAssignGovernor).siteId,
        realmId: queuedSnapshot.playerRealmId,
        generalId: (queuedSnapshot.pendingOrders[1] as DebugOrderAssignGovernor).generalId,
        modifierKind: 'tax_efficiency',
      }),
    ])

    expect(settledSnapshot.playerEconomy).toEqual({
      treasury: 2818,
      foodStores: 0,
      taxRate: 10,
    })
    expect(settledSnapshot.playerOwnedSiteTotals).toEqual({
      population: 121260,
      households: 24252,
    })
    expect(settledSnapshot.assignedGovernorSiteEconomy).toEqual({
      siteId: (queuedSnapshot.pendingOrders[1] as DebugOrderAssignGovernor).siteId,
      population: 10105,
      households: 2021,
      taxBase: 2026,
      foodProduction: 4042,
    })

    await expect(panel).toContainText('2,818')
    await expect(panel).toContainText('0')
    await expect(panel).toContainText('121,260')
    await expect(panel).toContainText('24,252')
    await expect(panel).toContainText('免税')
    await expect(panel).toContainText('剩余 2 月')
    await expect(panel).toContainText('咸阳')
    await expect(panel).toContainText('太守: 白起')

    await page.screenshot({ path: EVIDENCE_SCREENSHOT, fullPage: true })
  })
})
