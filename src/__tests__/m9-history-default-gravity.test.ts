import { describe, expect, it } from 'vitest'

import { runTickPhases } from '~/engine/clock'
import { realmDeactivationPhase } from '~/engine/wars/realm-deactivation'
import {
  M9_AI_ONLY_REALMS,
  M9_HISTORICAL_FIDELITY_TIER,
  M9_PLAYABLE_REALMS,
  M9_REALM_DEACTIVATION_HISTORICAL_YEARS,
  M9_SCENARIO_END_YEAR_BC,
  M9_SCENARIO_START_YEAR_BC,
} from '~/content/m2/balance'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { GameEvent, Realm, RealmId, Site, World } from '~/shared/types'

const SEED = 42
const TICKS_PER_YEAR = 36
const HISTORY_TOLERANCE_YEARS = 10
const TOTAL_TICKS = (M9_SCENARIO_START_YEAR_BC - M9_SCENARIO_END_YEAR_BC) * TICKS_PER_YEAR

const DEFAULT_GRAVITY_DEACTIVATION_YEARS: ReadonlyMap<RealmId, number> = new Map([
  ...Object.entries(M9_REALM_DEACTIVATION_HISTORICAL_YEARS),
  ['realm_song', 286],
  ['realm_lu', 249],
])

interface HistoryGravityReport {
  readonly finalWorld: World
  readonly deactivatedYearByRealm: ReadonlyMap<RealmId, number>
}

describe('M9 history default-gravity simulation', () => {
  it('AI-only simulation -453→-221 with seed=42 shows historical gravity', () => {
    const report = runHistoryDefaultGravitySimulation(createSyntheticM9World(SEED), TOTAL_TICKS)

    expect(M9_PLAYABLE_REALMS.length).toBe(8)
    expect(M9_AI_ONLY_REALMS.length).toBe(4)
    expect(report.finalWorld.realms.size).toBe(12)
    expect(M9_SCENARIO_START_YEAR_BC).toBe(453)
    expect(M9_SCENARIO_END_YEAR_BC).toBe(221)
    expect(M9_HISTORICAL_FIDELITY_TIER).toBe(1)

    expect(activeRealmCount(report.finalWorld)).toBeLessThanOrEqual(1)
    expectDeactivationAround(report, 'realm_yue', 334)
    expectDeactivationAround(report, 'realm_zhongshan', 296)
    expectDeactivationAround(report, 'realm_zhou', 256)
    expect(report.deactivatedYearByRealm.get('realm_qin')).toBeUndefined()
    expect(report.finalWorld.realms.get('realm_qin')?.status ?? 'active').toBe('active')
  })
})

function runHistoryDefaultGravitySimulation(world: World, ticks: number): HistoryGravityReport {
  let currentWorld = world
  const deactivatedYearByRealm = new Map<RealmId, number>()

  for (let tick = 0; tick < ticks; tick += 1) {
    const before = applyDefaultGravity(currentWorld)
    const result = runTickPhases(before, before.rngState)
    recordDeactivations(result.events, before, deactivatedYearByRealm)
    currentWorld = result.world
  }

  const finalBeforeDeactivation = applyDefaultGravity(currentWorld)
  const finalResult = realmDeactivationPhase(finalBeforeDeactivation, finalBeforeDeactivation.rngState)
  recordDeactivations(finalResult.events, finalBeforeDeactivation, deactivatedYearByRealm)

  return { finalWorld: finalResult.world, deactivatedYearByRealm }
}

function applyDefaultGravity(world: World): World {
  const sites = new Map(world.sites)
  let changed = false

  for (const [realmId, deactivationYearBC] of DEFAULT_GRAVITY_DEACTIVATION_YEARS) {
    if (world.date.yearBC > deactivationYearBC) continue
    const realm = world.realms.get(realmId)
    if (!realm || (realm.status ?? 'active') !== 'active') continue

    for (const [siteId, site] of sites) {
      if (site.ownerId !== realmId) continue
      sites.set(siteId, { ...site, ownerId: null, occupation: undefined })
      changed = true
    }
  }

  return changed ? { ...world, sites } : world
}

function recordDeactivations(
  events: readonly GameEvent[],
  worldBeforeTick: World,
  deactivatedYearByRealm: Map<RealmId, number>,
): void {
  for (const event of events) {
    if (event.type !== 'realmDeactivated') continue
    const payload = payloadRecord(event.payload)
    if (!payload) continue
    const realmId = payload.realmId
    if (typeof realmId !== 'string') continue
    if (deactivatedYearByRealm.has(realmId)) continue
    deactivatedYearByRealm.set(realmId, worldBeforeTick.date.yearBC)
  }
}

function payloadRecord(payload: unknown): Record<string, unknown> | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null
  return payload as Record<string, unknown>
}

function createSyntheticM9World(seed: number): World {
  const realmIds = [...M9_PLAYABLE_REALMS, ...M9_AI_ONLY_REALMS]
  return makeEmptyWorld({
    date: { yearBC: M9_SCENARIO_START_YEAR_BC, season: 'spring', month: 1, xun: 'shang' },
    rngState: { seed, counter: 0 },
    realms: new Map(realmIds.map((realmId) => [realmId, makeRealm(realmId)])),
    sites: new Map(realmIds.map((realmId) => [`site_${realmId}_capital`, makeSite(realmId)])),
    phases: [realmDeactivationPhase],
    playerRealmId: 'realm_qin',
  })
}

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `site_${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
    status: 'active',
  }
}

function makeSite(ownerId: RealmId): Site {
  return {
    id: `site_${ownerId}_capital`,
    name: `${ownerId} capital`,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 1000, households: 100, taxBase: 100, foodProduction: 100 },
    cultural: 'di_xirong',
    culturalIdentityStrength: 100,
    lastConquestTick: null,
    lowIdentitySinceTick: null,
    occupation: { occupierId: ownerId, controlLevel: 100 },
  }
}

function activeRealmCount(world: World): number {
  return [...world.realms.values()].filter((realm) => (realm.status ?? 'active') === 'active').length
}

function expectDeactivationAround(
  report: HistoryGravityReport,
  realmId: RealmId,
  expectedYearBC: number,
): void {
  const actualYearBC = report.deactivatedYearByRealm.get(realmId)
  expect(actualYearBC).toBeDefined()
  expect(Math.abs((actualYearBC ?? 0) - expectedYearBC)).toBeLessThanOrEqual(HISTORY_TOLERANCE_YEARS)
}
