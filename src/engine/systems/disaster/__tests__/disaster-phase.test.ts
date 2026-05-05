import { describe, expect, it } from 'vitest'

import { disasterPhase } from '../disaster-phase'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  DisasterDefinition,
  DisasterState,
  PersonalityArchetype,
  Realm,
  RulerState,
  Site,
  World,
} from '~/shared/types'
import {
  M42_DISASTER_COOLDOWN_TICKS,
  M42_DISASTER_DECISION_TIMEOUT_TICKS,
} from '~/content/m2/balance'

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_a',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 5000, foodStores: 5000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeRuler(personality: PersonalityArchetype, overrides: Partial<RulerState> = {}): RulerState {
  return {
    realmId: 'realm_qin',
    generalId: 'gen_ruler',
    age: 30,
    lifespan: 60,
    health: 100,
    personality,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
    ...overrides,
  }
}

function makeSite(id: string, ownerId: string | null): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 1000, households: 200, taxBase: 100, foodProduction: 100 },
  }
}

function makeGuaranteedDef(overrides: Partial<DisasterDefinition> = {}): DisasterDefinition {
  return {
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
    ...overrides,
  }
}

function makeNeverDef(overrides: Partial<DisasterDefinition> = {}): DisasterDefinition {
  return makeGuaranteedDef({ id: 'disaster_never', baseProbabilityBp: 0, ...overrides })
}

function makeBaseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    realms: new Map([['realm_qin', makeRealm()]]),
    rulers: new Map([['realm_qin', makeRuler('builder')]]),
    sites: new Map([['site_a', makeSite('site_a', 'realm_qin')]]),
    playerRealmId: 'realm_other',
    ...overrides,
  })
}

describe('disasterPhase: early return', () => {
  it('returns unchanged world when xun !== shang', () => {
    const world = makeBaseWorld({
      date: { yearBC: 260, season: 'spring', month: 1, xun: 'zhong' },
    })
    const rng = { seed: 1, counter: 0 }
    const result = disasterPhase(world, rng, [makeGuaranteedDef()])
    expect(result.world).toBe(world)
    expect(result.nextRng).toEqual(rng)
    expect(result.events).toEqual([])
  })

  it('does not consume RNG when not on shang xun', () => {
    const world = makeBaseWorld({
      date: { yearBC: 260, season: 'autumn', month: 2, xun: 'xia' },
    })
    const rng = { seed: 42, counter: 5 }
    const result = disasterPhase(world, rng, [makeGuaranteedDef()])
    expect(result.nextRng).toEqual(rng)
  })
})

describe('disasterPhase: trigger logic', () => {
  it('triggers a disaster when probability is guaranteed', () => {
    const world = makeBaseWorld()
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    const state = result.world.disasterStates.get('realm_qin')
    expect(state).toBeDefined()
    expect(state?.disasterId).toBe('disaster_test')
    expect(state?.siteId).toBe('site_a')
    expect(state?.realmId).toBe('realm_qin')
    expect(state?.startedAtTick).toBe(world.tick)
  })

  it('does not trigger a disaster when probability is zero', () => {
    const world = makeBaseWorld()
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeNeverDef()])
    expect(result.world.disasterStates.has('realm_qin')).toBe(false)
  })

  it('does not trigger when realm has no sites', () => {
    const world = makeBaseWorld({ sites: new Map() })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    expect(result.world.disasterStates.has('realm_qin')).toBe(false)
  })

  it('triggers at most one disaster per realm per tick', () => {
    const world = makeBaseWorld()
    const def2 = makeGuaranteedDef({ id: 'disaster_test_two' })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef(), def2])
    expect(result.world.disasterStates.size).toBe(1)
    const state = result.world.disasterStates.get('realm_qin')
    expect(state).toBeDefined()
    expect(state?.disasterId).toBe('disaster_test')
  })

  it('does not trigger when trigger predicate fails', () => {
    const def: DisasterDefinition = makeGuaranteedDef({
      trigger: { kind: 'realm.id', value: 'realm_other' },
    })
    const world = makeBaseWorld()
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [def])
    expect(result.world.disasterStates.has('realm_qin')).toBe(false)
  })
})

describe('disasterPhase: AI vs player resolution', () => {
  it('player realm disaster stays awaiting_decision', () => {
    const world = makeBaseWorld({ playerRealmId: 'realm_qin' })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    const state = result.world.disasterStates.get('realm_qin')
    expect(state?.status).toBe('awaiting_decision')
    expect(state?.chosenChoiceId).toBeUndefined()
    expect(state?.resolvedAtTick).toBeUndefined()
  })

  it('AI realm auto-resolves immediately', () => {
    const world = makeBaseWorld({
      rulers: new Map([['realm_qin', makeRuler('benevolent')]]),
    })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    const state = result.world.disasterStates.get('realm_qin')
    expect(state?.status).toBe('resolved')
    expect(state?.chosenChoiceId).toBe('open_granary')
    expect(state?.resolvedAtTick).toBe(world.tick)
  })

  it('AI auto-resolve uses personality preference (tyrant → forced_levy)', () => {
    const world = makeBaseWorld({
      rulers: new Map([['realm_qin', makeRuler('tyrant')]]),
    })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    const state = result.world.disasterStates.get('realm_qin')
    expect(state?.status).toBe('resolved')
    expect(state?.chosenChoiceId).toBe('forced_levy')
  })
})

describe('disasterPhase: state lifecycle', () => {
  it('skips realm with active awaiting_decision (within timeout)', () => {
    const existing: DisasterState = {
      realmId: 'realm_qin',
      disasterId: 'disaster_test',
      siteId: 'site_a',
      startedAtTick: 0,
      status: 'awaiting_decision',
    }
    const world = makeBaseWorld({
      tick: 1,
      disasterStates: new Map([['realm_qin', existing]]),
      playerRealmId: 'realm_qin',
    })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    const state = result.world.disasterStates.get('realm_qin')
    expect(state).toBe(existing)
    expect(result.world.disasterStates.size).toBe(1)
  })

  it('auto-resolves awaiting_decision to ignore after decision timeout', () => {
    const existing: DisasterState = {
      realmId: 'realm_qin',
      disasterId: 'disaster_test',
      siteId: 'site_a',
      startedAtTick: 0,
      status: 'awaiting_decision',
    }
    const world = makeBaseWorld({
      tick: M42_DISASTER_DECISION_TIMEOUT_TICKS,
      disasterStates: new Map([['realm_qin', existing]]),
      playerRealmId: 'realm_qin',
    })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    const state = result.world.disasterStates.get('realm_qin')
    expect(state?.status).toBe('resolved')
    expect(state?.chosenChoiceId).toBe('ignore')
    expect(state?.resolvedAtTick).toBe(world.tick)
  })

  it('skips realm in cooldown after recent resolved disaster', () => {
    const existing: DisasterState = {
      realmId: 'realm_qin',
      disasterId: 'disaster_test',
      siteId: 'site_a',
      startedAtTick: 0,
      status: 'resolved',
      chosenChoiceId: 'ignore',
      resolvedAtTick: 0,
    }
    const world = makeBaseWorld({
      tick: M42_DISASTER_COOLDOWN_TICKS - 1,
      disasterStates: new Map([['realm_qin', existing]]),
    })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    expect(result.world.disasterStates.get('realm_qin')).toBe(existing)
  })

  it('allows new disaster after cooldown elapsed', () => {
    const existing: DisasterState = {
      realmId: 'realm_qin',
      disasterId: 'disaster_test',
      siteId: 'site_a',
      startedAtTick: 0,
      status: 'resolved',
      chosenChoiceId: 'ignore',
      resolvedAtTick: 0,
    }
    const world = makeBaseWorld({
      tick: M42_DISASTER_COOLDOWN_TICKS,
      disasterStates: new Map([['realm_qin', existing]]),
      playerRealmId: 'realm_qin',
    })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    const state = result.world.disasterStates.get('realm_qin')
    expect(state?.status).toBe('awaiting_decision')
    expect(state?.startedAtTick).toBe(world.tick)
  })

  it('skips realm with status=resolving', () => {
    const existing: DisasterState = {
      realmId: 'realm_qin',
      disasterId: 'disaster_test',
      siteId: 'site_a',
      startedAtTick: 0,
      status: 'resolving',
    }
    const world = makeBaseWorld({
      tick: 1,
      disasterStates: new Map([['realm_qin', existing]]),
    })
    const result = disasterPhase(world, { seed: 1, counter: 0 }, [makeGuaranteedDef()])
    expect(result.world.disasterStates.get('realm_qin')).toBe(existing)
  })
})

describe('disasterPhase: determinism & contract', () => {
  it('same seed produces identical results', () => {
    const world = makeBaseWorld()
    const r1 = disasterPhase(world, { seed: 7, counter: 0 }, [makeGuaranteedDef()])
    const r2 = disasterPhase(world, { seed: 7, counter: 0 }, [makeGuaranteedDef()])
    expect(r1.world.disasterStates.get('realm_qin')).toEqual(
      r2.world.disasterStates.get('realm_qin'),
    )
    expect(r1.nextRng).toEqual(r2.nextRng)
  })

  it('iterates realms in sorted ID order (RNG contract)', () => {
    const realms = new Map<string, Realm>([
      ['realm_zhao', makeRealm({ id: 'realm_zhao', capital: 'site_zhao' })],
      ['realm_qin', makeRealm({ id: 'realm_qin', capital: 'site_qin' })],
    ])
    const rulers = new Map<string, RulerState>([
      ['realm_zhao', makeRuler('benevolent', { realmId: 'realm_zhao' })],
      ['realm_qin', makeRuler('benevolent', { realmId: 'realm_qin' })],
    ])
    const sites = new Map<string, Site>([
      ['site_qin', makeSite('site_qin', 'realm_qin')],
      ['site_zhao', makeSite('site_zhao', 'realm_zhao')],
    ])
    const world = makeEmptyWorld({ realms, rulers, sites, playerRealmId: 'realm_other' })
    const result = disasterPhase(world, { seed: 11, counter: 0 }, [makeGuaranteedDef()])
    expect(result.world.disasterStates.size).toBe(2)
    expect(result.events.length).toBeGreaterThanOrEqual(2)
    const triggers = result.events.filter((e) => e.type === 'disasterTriggered')
    expect(triggers).toHaveLength(2)
    const triggerRealms = triggers.map(
      (e) => (e.payload as { realmId: string }).realmId,
    )
    expect(triggerRealms).toEqual(['realm_qin', 'realm_zhao'])
  })

  it('emits disasterTriggered event with realmId/disasterId/siteId payload', () => {
    const world = makeBaseWorld({ playerRealmId: 'realm_qin' })
    const result = disasterPhase(world, { seed: 3, counter: 0 }, [makeGuaranteedDef()])
    const triggered = result.events.find((e) => e.type === 'disasterTriggered')
    expect(triggered).toBeDefined()
    expect(triggered?.payload).toEqual({
      realmId: 'realm_qin',
      disasterId: 'disaster_test',
      siteId: 'site_a',
    })
  })
})

describe('disasterPhase: defaults', () => {
  it('uses default M4.2 disaster definitions when none passed', () => {
    const world = makeBaseWorld()
    const result = disasterPhase(world, { seed: 1, counter: 0 })
    expect(result).toBeDefined()
    expect(result.world.disasterStates).toBeDefined()
  })
})
