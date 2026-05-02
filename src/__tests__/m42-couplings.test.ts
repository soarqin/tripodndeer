/* eslint-disable max-lines-per-function */
import { describe, expect, it } from 'vitest'

import { makeTestWorld } from '~/engine/__tests__/world-test-fixtures'
import type {
  DisasterDefinition,
  FactionId,
  FactionInfluenceState,
  General,
  Order,
  PersonalityArchetype,
  Realm,
  ReformDefinition,
  ReformState,
  RulerState,
  Site,
  TradeRoute,
} from '~/shared/types'
import { disasterPhase } from '~/engine/systems/disaster/disaster-phase'
import { reformPhase } from '~/engine/systems/reform/reform-phase'
import { completeReform } from '~/engine/systems/reform/stage-progression'
import { tradePhase } from '~/engine/systems/trade/trade-phase'
import { selectHeir } from '~/engine/systems/ruler/succession'
import { applyOrder } from '~/engine/systems/orders/orders'

const ALL_FACTIONS: readonly FactionId[] = [
  'royal_kin',
  'noble_clans',
  'military_meritocracy',
  'reformists',
  'conservatives',
  'foreign_clients',
]

function makeFactionState(
  realmId: string,
  overrides: Partial<Record<FactionId, number>> = {},
): FactionInfluenceState {
  const influences = new Map<FactionId, number>()
  for (const f of ALL_FACTIONS) influences.set(f, 50)
  for (const [k, v] of Object.entries(overrides)) {
    influences.set(k as FactionId, v as number)
  }
  return { realmId, influences }
}

function makeRealm(id: string, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ff0000',
    capital: `site_${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 5000, foodStores: 5000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeRuler(
  realmId: string,
  generalId: string,
  personality: PersonalityArchetype,
): RulerState {
  return {
    realmId,
    generalId,
    age: 30,
    lifespan: 60,
    health: 100,
    personality,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function makeSite(id: string, ownerId: string | null, adjacency: readonly string[] = []): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [...adjacency],
    economy: { population: 1000, households: 200, taxBase: 100, foodProduction: 100 },
  }
}

describe('M4.2 cross-system couplings', () => {
  it('T16: ignore disaster reduces noble_clans and increases military_meritocracy', () => {
    const def: DisasterDefinition = {
      id: 'disaster_test',
      displayName: 'Test',
      displayNameZh: '测试',
      trigger: { kind: 'and', children: [] },
      baseProbabilityBp: 120_000,
      effects: [],
      playerChoices: [
        { id: 'open_granary', labelZh: 'A', costType: 'foodStores', costAmount: 0, effects: [], outcomeZh: 'a' },
        { id: 'reduce_tax', labelZh: 'B', costType: 'treasury', costAmount: 0, effects: [], outcomeZh: 'b' },
        { id: 'forced_levy', labelZh: 'C', costType: 'none', costAmount: 0, effects: [], outcomeZh: 'c' },
        { id: 'ignore', labelZh: 'D', costType: 'none', costAmount: 0, effects: [], outcomeZh: 'd' },
      ],
      durationMonths: 1,
    }

    const world = makeTestWorld({
      realms: new Map([['realm_chu', makeRealm('realm_chu')]]),
      rulers: new Map([['realm_chu', makeRuler('realm_chu', 'gen_chu_ruler', 'conqueror')]]),
      sites: new Map([['site_a', makeSite('site_a', 'realm_chu')]]),
      factionInfluences: new Map([['realm_chu', makeFactionState('realm_chu')]]),
      playerRealmId: 'realm_other',
    })

    const result = disasterPhase(world, { seed: 1, counter: 0 }, [def])
    const state = result.world.disasterStates.get('realm_chu')
    expect(state?.status).toBe('resolved')
    expect(state?.chosenChoiceId).toBe('ignore')

    const factionState = result.world.factionInfluences.get('realm_chu')
    expect(factionState?.influences.get('noble_clans')).toBe(40)
    expect(factionState?.influences.get('military_meritocracy')).toBe(55)
  })

  it('T17: shang_yang reform completion increases military_meritocracy and decreases noble_clans', () => {
    const reformDef: ReformDefinition = {
      id: 'shang_yang',
      displayName: 'Shang Yang',
      displayNameZh: '商鞅变法',
      trigger: { kind: 'and', children: [] },
      oneShot: true,
      stages: [
        {
          id: 's1',
          textZh: 'Stage',
          choices: [{ id: 'pick', labelZh: 'Pick', effects: [], outcome: 'success' }],
          advanceAfterMonths: 12,
        },
      ],
      successTrait: 'shang_yang_reform_done',
      failureTrait: 'reform_failed_scar',
    }

    const reformState: ReformState = {
      realmId: 'realm_qin',
      reformId: 'shang_yang',
      currentStageId: 's1',
      startedAtTick: 0,
      stageEnteredAtTick: 0,
      status: 'in_progress',
      choiceHistory: [],
    }

    const world = makeTestWorld({
      realms: new Map([['realm_qin', makeRealm('realm_qin')]]),
      reformStates: new Map([['realm_qin', reformState]]),
      factionInfluences: new Map([['realm_qin', makeFactionState('realm_qin')]]),
    })

    const result = completeReform(world, 'realm_qin', reformDef, true)
    const factionState = result.world.factionInfluences.get('realm_qin')
    expect(factionState?.influences.get('military_meritocracy')).toBe(70)
    expect(factionState?.influences.get('noble_clans')).toBe(35)
    expect(factionState?.influences.get('conservatives')).toBe(40)
  })

  it('T18: high conservatives influence blocks shang_yang reform AI trigger', () => {
    const reformDef: ReformDefinition = {
      id: 'shang_yang',
      displayName: 'Shang Yang',
      displayNameZh: '商鞅变法',
      trigger: { kind: 'and', children: [] },
      oneShot: true,
      stages: [
        {
          id: 's1',
          textZh: 'Stage',
          choices: [{ id: 'pick', labelZh: 'Pick', effects: [], outcome: 'success' }],
          advanceAfterMonths: 12,
        },
      ],
      successTrait: 'shang_yang_reform_done',
      failureTrait: 'reform_failed_scar',
    }

    const blockedWorld = makeTestWorld({
      realms: new Map([['realm_qin', makeRealm('realm_qin')]]),
      rulers: new Map([['realm_qin', makeRuler('realm_qin', 'gen_qin_ruler', 'builder')]]),
      factionInfluences: new Map([
        ['realm_qin', makeFactionState('realm_qin', { conservatives: 85 })],
      ]),
      playerRealmId: 'realm_other',
    })

    const blockedResult = reformPhase(blockedWorld, { seed: 1, counter: 0 }, [reformDef])
    expect(blockedResult.world.reformStates.has('realm_qin')).toBe(false)
    expect(blockedResult.events).toEqual([])

    const allowedWorld = makeTestWorld({
      realms: new Map([['realm_qin', makeRealm('realm_qin')]]),
      rulers: new Map([['realm_qin', makeRuler('realm_qin', 'gen_qin_ruler', 'builder')]]),
      factionInfluences: new Map([
        ['realm_qin', makeFactionState('realm_qin', { conservatives: 50 })],
      ]),
      playerRealmId: 'realm_other',
    })

    const allowedResult = reformPhase(allowedWorld, { seed: 1, counter: 0 }, [reformDef])
    expect(allowedResult.world.reformStates.get('realm_qin')?.reformId).toBe('shang_yang')
  })

  it('T19: selectHeir prefers candidate from dominant faction', () => {
    const candidateA: General = {
      id: 'gen_a',
      realmId: 'realm_qin',
      name: 'A',
      might: 50,
      command: 50,
      loyalty: 80,
      faction: 'military_meritocracy',
      attrs: { wu: 50, zheng: 50, jiao: 50, mou: 50, xue: 50, po: 50 },
    }
    const candidateB: General = {
      id: 'gen_b',
      realmId: 'realm_qin',
      name: 'B',
      might: 50,
      command: 50,
      loyalty: 80,
      faction: 'noble_clans',
      attrs: { wu: 50, zheng: 50, jiao: 50, mou: 50, xue: 50, po: 50 },
    }

    const world = makeTestWorld({
      realms: new Map([['realm_qin', makeRealm('realm_qin')]]),
      generals: new Map([
        ['gen_a', candidateA],
        ['gen_b', candidateB],
      ]),
      factionInfluences: new Map([
        ['realm_qin', makeFactionState('realm_qin', { military_meritocracy: 90, noble_clans: 20 })],
      ]),
    })

    expect(selectHeir(world, 'realm_qin')).toBe('gen_a')

    const flipped = makeTestWorld({
      realms: new Map([['realm_qin', makeRealm('realm_qin')]]),
      generals: new Map([
        ['gen_a', candidateA],
        ['gen_b', candidateB],
      ]),
      factionInfluences: new Map([
        ['realm_qin', makeFactionState('realm_qin', { military_meritocracy: 20, noble_clans: 90 })],
      ]),
    })

    expect(selectHeir(flipped, 'realm_qin')).toBe('gen_b')
  })

  it('T20: active trade route increases foreign_clients influence on both realms', () => {
    const route: TradeRoute = {
      id: 'route_qin_chu',
      fromSiteId: 'site_qin',
      toSiteId: 'site_chu',
      fromRealmId: 'realm_qin',
      toRealmId: 'realm_chu',
      establishedAtTick: 0,
      baseIncomePerXun: 100,
      status: 'active',
    }

    const world = makeTestWorld({
      realms: new Map([
        ['realm_qin', makeRealm('realm_qin')],
        ['realm_chu', makeRealm('realm_chu')],
      ]),
      sites: new Map([
        ['site_qin', makeSite('site_qin', 'realm_qin', ['site_chu'])],
        ['site_chu', makeSite('site_chu', 'realm_chu', ['site_qin'])],
      ]),
      tradeRoutes: new Map([['route_qin_chu', route]]),
      factionInfluences: new Map([
        ['realm_qin', makeFactionState('realm_qin')],
        ['realm_chu', makeFactionState('realm_chu')],
      ]),
    })

    const result = tradePhase(world, { seed: 1, counter: 0 })
    const qinFc = result.world.factionInfluences.get('realm_qin')?.influences.get('foreign_clients') ?? 0
    const chuFc = result.world.factionInfluences.get('realm_chu')?.influences.get('foreign_clients') ?? 0
    expect(qinFc).toBeGreaterThan(50)
    expect(chuFc).toBeGreaterThan(50)
  })

  it('T21: war declaration cuts active trade routes between belligerents', () => {
    const route: TradeRoute = {
      id: 'route_qin_chu',
      fromSiteId: 'site_qin',
      toSiteId: 'site_chu',
      fromRealmId: 'realm_qin',
      toRealmId: 'realm_chu',
      establishedAtTick: 0,
      baseIncomePerXun: 100,
      status: 'active',
    }
    const unrelatedRoute: TradeRoute = {
      id: 'route_qin_zhao',
      fromSiteId: 'site_qin',
      toSiteId: 'site_zhao',
      fromRealmId: 'realm_qin',
      toRealmId: 'realm_zhao',
      establishedAtTick: 0,
      baseIncomePerXun: 100,
      status: 'active',
    }

    const world = makeTestWorld({
      realms: new Map([
        ['realm_qin', makeRealm('realm_qin')],
        ['realm_chu', makeRealm('realm_chu')],
        ['realm_zhao', makeRealm('realm_zhao')],
      ]),
      sites: new Map([
        ['site_qin', makeSite('site_qin', 'realm_qin')],
        ['site_chu', makeSite('site_chu', 'realm_chu')],
        ['site_zhao', makeSite('site_zhao', 'realm_zhao')],
      ]),
      tradeRoutes: new Map([
        ['route_qin_chu', route],
        ['route_qin_zhao', unrelatedRoute],
      ]),
      playerRealmId: 'realm_qin',
    })

    const order: Order = { type: 'declare-war', targetRealmId: 'realm_chu' }
    const { world: nextWorld } = applyOrder(world, order)

    expect(nextWorld.tradeRoutes.get('route_qin_chu')?.status).toBe('cut')
    expect(nextWorld.tradeRoutes.get('route_qin_zhao')?.status).toBe('active')
  })
})
