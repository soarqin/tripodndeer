// §12.2 Acceptance Test: intelligence coverage affects army visibility on map
import { describe, it, expect, vi } from 'vitest'

import {
  M7_COVERAGE_TIER_1,
  M7_COVERAGE_TIER_2,
  M7_COVERAGE_TIER_3,
} from '~/content/m2/balance'
import { computeRealmAdjacency } from '~/engine/systems/espionage/adjacency'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { drawArmies } from '~/rendering/map/army-render'
import type { Army, Realm, RealmId, Site } from '~/shared/types'
import { makeCoverageKey } from '~/shared/types'

const PLAYER: RealmId = 'realm_qin'
const ENEMY: RealmId = 'realm_wei'
const SILVER = '#C0C0C0'

interface MockResult {
  ctx: CanvasRenderingContext2D
  strokeCalls: string[]
}

function makeMockCtx(): MockResult {
  const strokeCalls: string[] = []
  let currentStroke = ''
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(() => { strokeCalls.push(currentStroke) }),
    fillText: vi.fn(),
    fillStyle: '',
    get strokeStyle() { return currentStroke },
    set strokeStyle(v: string) { currentStroke = v },
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, strokeCalls }
}

function makeArmy(id: string, realmId: RealmId, location: string): Army {
  return {
    id,
    realmId,
    manpower: 5000,
    location,
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
  } as unknown as Army
}

function makeSite(id: string, position: [number, number] = [100, 200]): Site {
  return {
    id,
    name: id,
    position,
    boundary: [],
    ownerId: null,
    polygon: [],
    adjacency: [],
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
  } as unknown as Site
}

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ff0000',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  } as unknown as Realm
}

interface DrawCallArgs {
  coverage: number
  ownerRealm?: RealmId
  isAlly?: boolean
}

function callDrawWithCoverage(
  ctx: CanvasRenderingContext2D,
  args: DrawCallArgs,
): void {
  const ownerRealm = args.ownerRealm ?? ENEMY
  const army = makeArmy('army_1', ownerRealm, 'site_1')
  const site = makeSite('site_1', [100, 200])
  const realm = makeRealm(ownerRealm)
  const cov = new Map<string, number>([
    [makeCoverageKey(PLAYER, ENEMY), args.coverage],
  ])
  const allies: ReadonlySet<RealmId> = args.isAlly ? new Set([ENEMY]) : new Set()
  drawArmies(
    ctx,
    new Map([[army.id, army]]),
    new Map([[site.id, site]]),
    new Map([[ownerRealm, realm]]),
    null,
    PLAYER,
    cov,
    allies,
    true,
  )
}

describe('§12.2: intelligence coverage affects enemy army visibility', () => {
  describe('tier transitions: render gating responds to coverage value', () => {
    it('coverage=0 → tier=hidden → army NOT rendered', () => {
      const { ctx } = makeMockCtx()
      callDrawWithCoverage(ctx, { coverage: 0 })
      expect(ctx.arc).not.toHaveBeenCalled()
      expect(ctx.fillText).not.toHaveBeenCalled()
    })

    it('coverage=M7_COVERAGE_TIER_1 (30) → tier=low → dot visible, manpower hidden', () => {
      const { ctx } = makeMockCtx()
      callDrawWithCoverage(ctx, { coverage: M7_COVERAGE_TIER_1 })
      expect(ctx.arc).toHaveBeenCalled()
      expect(ctx.fillText).not.toHaveBeenCalled()
    })

    it('coverage=M7_COVERAGE_TIER_2 (60) → tier=mid → dot + manpower visible, no silver border', () => {
      const { ctx, strokeCalls } = makeMockCtx()
      callDrawWithCoverage(ctx, { coverage: M7_COVERAGE_TIER_2 })
      expect(ctx.arc).toHaveBeenCalled()
      expect(ctx.fillText).toHaveBeenCalled()
      expect(strokeCalls).not.toContain(SILVER)
    })

    it('coverage=M7_COVERAGE_TIER_3 (90) → tier=high → dot + manpower + silver border', () => {
      const { ctx, strokeCalls } = makeMockCtx()
      callDrawWithCoverage(ctx, { coverage: M7_COVERAGE_TIER_3 })
      expect(ctx.arc).toHaveBeenCalled()
      expect(ctx.fillText).toHaveBeenCalled()
      expect(strokeCalls).toContain(SILVER)
    })
  })

  describe('tier boundaries: exact thresholds', () => {
    it('coverage=29 → still tier=hidden (boundary just below TIER_1)', () => {
      const { ctx } = makeMockCtx()
      callDrawWithCoverage(ctx, { coverage: 29 })
      expect(ctx.arc).not.toHaveBeenCalled()
    })

    it('coverage=30 → tier=low (exact M7_COVERAGE_TIER_1)', () => {
      const { ctx } = makeMockCtx()
      callDrawWithCoverage(ctx, { coverage: 30 })
      expect(ctx.arc).toHaveBeenCalled()
      expect(ctx.fillText).not.toHaveBeenCalled()
    })
  })

  describe('owner relation: own realm and allies bypass coverage gating', () => {
    it('own realm army: full visibility even at coverage=0', () => {
      const { ctx } = makeMockCtx()
      callDrawWithCoverage(ctx, { coverage: 0, ownerRealm: PLAYER })
      expect(ctx.arc).toHaveBeenCalled()
      expect(ctx.fillText).toHaveBeenCalled()
    })

    it('active ally: full visibility even at coverage=0', () => {
      const { ctx } = makeMockCtx()
      callDrawWithCoverage(ctx, { coverage: 0, isAlly: true })
      expect(ctx.arc).toHaveBeenCalled()
      expect(ctx.fillText).toHaveBeenCalled()
    })
  })

  describe('factory parity: initial M1 world coverage seeded by adjacency', () => {
    it('adjacent realm pair seeded with M7_COVERAGE_TIER_1 (30)', () => {
      const data = loadM1Data()
      const adjacency = computeRealmAdjacency(data.sites, data.initialOwnership)
      const world = createWorldFromM1Data(data, 42, PLAYER)

      const qinNeighbors = adjacency.get(PLAYER)
      expect(qinNeighbors).toBeDefined()
      expect(qinNeighbors!.size).toBeGreaterThan(0)

      const adjacentTarget = [...qinNeighbors!][0]!
      const seeded = world.intelligenceCoverage.get(
        makeCoverageKey(PLAYER, adjacentTarget),
      )
      expect(seeded).toBe(M7_COVERAGE_TIER_1)
    })

    it('non-adjacent realm pair seeded with 0', () => {
      const data = loadM1Data()
      const adjacency = computeRealmAdjacency(data.sites, data.initialOwnership)
      const world = createWorldFromM1Data(data, 42, PLAYER)

      const allRealmIds = data.realms.map(r => r.id)
      const qinNeighbors = adjacency.get(PLAYER) ?? new Set<RealmId>()
      const nonAdjacent = allRealmIds.find(
        r => r !== PLAYER && !qinNeighbors.has(r),
      )
      expect(nonAdjacent).toBeDefined()

      const seeded = world.intelligenceCoverage.get(
        makeCoverageKey(PLAYER, nonAdjacent!),
      )
      expect(seeded).toBe(0)
    })
  })

  describe('end-to-end: initial world → enemy visibility matches adjacency seeding', () => {
    it('non-adjacent enemy army: hidden in initial world (coverage=0)', () => {
      const data = loadM1Data()
      const adjacency = computeRealmAdjacency(data.sites, data.initialOwnership)
      const world = createWorldFromM1Data(data, 42, PLAYER)

      const allRealmIds = data.realms.map(r => r.id)
      const qinNeighbors = adjacency.get(PLAYER) ?? new Set<RealmId>()
      const nonAdjacent = allRealmIds.find(
        r => r !== PLAYER && !qinNeighbors.has(r),
      )
      expect(nonAdjacent).toBeDefined()

      const enemyArmy = makeArmy('enemy_army', nonAdjacent!, 'mock_site')
      const armies = new Map([[enemyArmy.id, enemyArmy]])
      const sites = new Map([['mock_site', makeSite('mock_site')]])
      const realms = new Map([[nonAdjacent!, makeRealm(nonAdjacent!)]])

      const { ctx } = makeMockCtx()
      drawArmies(
        ctx,
        armies,
        sites,
        realms,
        null,
        PLAYER,
        world.intelligenceCoverage,
        new Set(),
        true,
      )

      expect(ctx.arc).not.toHaveBeenCalled()
      expect(ctx.fillText).not.toHaveBeenCalled()
    })

    it('adjacent enemy army: low-tier visibility in initial world (coverage=30)', () => {
      const data = loadM1Data()
      const adjacency = computeRealmAdjacency(data.sites, data.initialOwnership)
      const world = createWorldFromM1Data(data, 42, PLAYER)

      const qinNeighbors = adjacency.get(PLAYER)
      expect(qinNeighbors).toBeDefined()
      const adjacentTarget = [...qinNeighbors!][0]!

      const enemyArmy = makeArmy('enemy_army', adjacentTarget, 'mock_site')
      const armies = new Map([[enemyArmy.id, enemyArmy]])
      const sites = new Map([['mock_site', makeSite('mock_site')]])
      const realms = new Map([[adjacentTarget, makeRealm(adjacentTarget)]])

      const { ctx } = makeMockCtx()
      drawArmies(
        ctx,
        armies,
        sites,
        realms,
        null,
        PLAYER,
        world.intelligenceCoverage,
        new Set(),
        true,
      )

      expect(ctx.arc).toHaveBeenCalled()
      expect(ctx.fillText).not.toHaveBeenCalled()
    })
  })
})
