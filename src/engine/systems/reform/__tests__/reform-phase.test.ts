import { describe, expect, it } from 'vitest'

import { reformPhase } from '../reform-phase'
import { makeTestWorld } from '~/engine/__tests__/world-test-fixtures'
import type {
  General,
  PersonalityArchetype,
  Realm,
  ReformDefinition,
  ReformState,
  RulerState,
  World,
} from '~/shared/types'

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_qin_capital',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 5000, foodStores: 0, taxRate: 10 },
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

function makeReformer(overrides: Partial<General> = {}): General {
  return {
    id: 'gen_reformer',
    realmId: 'realm_qin',
    name: 'Reformer',
    might: 50,
    command: 50,
    loyalty: 80,
    specialty: 'reformer',
    ...overrides,
  }
}

function makeSimpleReformDef(): ReformDefinition {
  return {
    id: 'test_reform',
    displayName: 'Test Reform',
    displayNameZh: '测试',
    trigger: { kind: 'realm.id', value: 'realm_qin' },
    oneShot: true,
    stages: [
      {
        id: 'stage1',
        textZh: 'Stage 1',
        choices: [
          { id: 'pick', labelZh: 'Pick', effects: [], outcome: 'success' },
        ],
        advanceAfterMonths: 12,
      },
    ],
    successTrait: 'shang_yang_reform_done',
    failureTrait: 'reform_failed_scar',
  }
}

function makeWorldWithBuilder(overrides: Partial<World> = {}): World {
  return makeTestWorld({
    realms: new Map([['realm_qin', makeRealm()]]),
    rulers: new Map([['realm_qin', makeRuler('builder')]]),
    playerRealmId: 'realm_other',
    ...overrides,
  })
}

describe('reformPhase: early return', () => {
  it('returns unchanged world when not year-start', () => {
    const world = makeTestWorld({
      date: { yearBC: 260, season: 'summer', month: 1, xun: 'shang' },
      realms: new Map([['realm_qin', makeRealm()]]),
      rulers: new Map([['realm_qin', makeRuler('builder')]]),
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeSimpleReformDef()])
    expect(result.world).toBe(world)
    expect(result.nextRng).toEqual({ seed: 1, counter: 0 })
    expect(result.events).toEqual([])
  })

  it('does not consume RNG when not year-start', () => {
    const world = makeTestWorld({
      date: { yearBC: 260, season: 'autumn', month: 2, xun: 'zhong' },
    })
    const rng = { seed: 42, counter: 5 }
    const result = reformPhase(world, rng, [makeSimpleReformDef()])
    expect(result.nextRng).toEqual(rng)
  })
})

describe('reformPhase: AI trigger', () => {
  it('starts reform for builder ruler when trigger satisfied and RNG rolls below propensity', () => {
    const world = makeWorldWithBuilder()
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeSimpleReformDef()])
    const state = result.world.reformStates.get('realm_qin')
    expect(state).toBeDefined()
    expect(state?.reformId).toBe('test_reform')
    expect(state?.status).toBe('in_progress')
    expect(state?.currentStageId).toBe('stage1')
    expect(result.events).toContainEqual({
      type: 'reformStarted',
      payload: { realmId: 'realm_qin', reformId: 'test_reform' },
    })
  })

  it('does not start reform for steward ruler (propensity 0)', () => {
    const world = makeWorldWithBuilder({
      rulers: new Map([['realm_qin', makeRuler('steward')]]),
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeSimpleReformDef()])
    expect(result.world.reformStates.has('realm_qin')).toBe(false)
    expect(result.events).toEqual([])
  })

  it('does not consume RNG for steward (propensity short-circuit)', () => {
    const world = makeWorldWithBuilder({
      rulers: new Map([['realm_qin', makeRuler('steward')]]),
    })
    const rng = { seed: 42, counter: 0 }
    const result = reformPhase(world, rng, [makeSimpleReformDef()])
    expect(result.nextRng).toEqual(rng)
  })

  it('skips player realm even when trigger satisfied', () => {
    const world = makeWorldWithBuilder({ playerRealmId: 'realm_qin' })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeSimpleReformDef()])
    expect(result.world.reformStates.has('realm_qin')).toBe(false)
    expect(result.events).toEqual([])
  })

  it('skips realm with reform_failed_scar trait (cooldown)', () => {
    const world = makeWorldWithBuilder({
      realms: new Map([['realm_qin', makeRealm({ traits: ['reform_failed_scar'] })]]),
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeSimpleReformDef()])
    expect(result.world.reformStates.has('realm_qin')).toBe(false)
  })

  it('does not start reform when trigger predicate fails', () => {
    const world = makeWorldWithBuilder()
    const def: ReformDefinition = {
      ...makeSimpleReformDef(),
      trigger: { kind: 'realm.id', value: 'realm_zhao' },
    }
    const result = reformPhase(world, { seed: 1, counter: 0 }, [def])
    expect(result.world.reformStates.has('realm_qin')).toBe(false)
  })

  it('does nothing when reformDefs empty (default)', () => {
    const world = makeWorldWithBuilder()
    const result = reformPhase(world, { seed: 1, counter: 0 })
    expect(result.world.reformStates.size).toBe(0)
    expect(result.events).toEqual([])
  })
})

describe('reformPhase: active reform handling', () => {
  function makeActiveReformWorld(stateOverrides: Partial<ReformState> = {}, generals: Map<string, General> = new Map([['gen_reformer', makeReformer()]])): World {
    const reformState: ReformState = {
      realmId: 'realm_qin',
      reformId: 'test_reform',
      currentStageId: 'stage1',
      startedAtTick: 0,
      stageEnteredAtTick: 0,
      status: 'in_progress',
      choiceHistory: [],
      ...stateOverrides,
    }
    return makeTestWorld({
      tick: 0,
      realms: new Map([['realm_qin', makeRealm()]]),
      rulers: new Map([['realm_qin', makeRuler('builder')]]),
      generals,
      reformStates: new Map([['realm_qin', reformState]]),
      playerRealmId: 'realm_other',
    })
  }

  it('skips AI trigger for realm with in_progress reform', () => {
    const world = makeActiveReformWorld()
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeSimpleReformDef()])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.reformId).toBe('test_reform')
    expect(state?.status).toBe('in_progress')
    expect(result.events).not.toContainEqual(
      expect.objectContaining({ type: 'reformStarted' }),
    )
  })

  it('pauses reform when reformer absent and within grace period', () => {
    const world = makeActiveReformWorld({}, new Map())
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeSimpleReformDef()])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.status).toBe('paused')
  })

  it('fails reform when reformer absent and past grace period', () => {
    const reformState: ReformState = {
      realmId: 'realm_qin',
      reformId: 'test_reform',
      currentStageId: 'stage1',
      startedAtTick: 0,
      stageEnteredAtTick: 0,
      status: 'in_progress',
      choiceHistory: [],
    }
    const world = makeTestWorld({
      tick: 73,
      realms: new Map([['realm_qin', makeRealm()]]),
      rulers: new Map([['realm_qin', makeRuler('builder')]]),
      generals: new Map(),
      reformStates: new Map([['realm_qin', reformState]]),
      playerRealmId: 'realm_other',
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeSimpleReformDef()])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.status).toBe('completed_failure')
    expect(result.world.realms.get('realm_qin')?.traits).toContain('reform_failed_scar')
  })

  it('auto-advances reform stage when advance threshold reached', () => {
    const def: ReformDefinition = {
      id: 'multi_stage',
      displayName: 'Multi',
      displayNameZh: '多',
      trigger: { kind: 'realm.id', value: 'realm_qin' },
      oneShot: true,
      stages: [
        {
          id: 'stage1',
          textZh: 'Stage 1',
          choices: [
            { id: 'go', labelZh: 'Go', effects: [], outcome: 'continue', nextStageId: 'stage2' },
          ],
          advanceAfterMonths: 12,
        },
        {
          id: 'stage2',
          textZh: 'Stage 2',
          choices: [
            { id: 'finish', labelZh: 'Finish', effects: [], outcome: 'success' },
          ],
          advanceAfterMonths: 12,
        },
      ],
      successTrait: 'shang_yang_reform_done',
      failureTrait: 'reform_failed_scar',
    }
    const reformState: ReformState = {
      realmId: 'realm_qin',
      reformId: 'multi_stage',
      currentStageId: 'stage1',
      startedAtTick: 0,
      stageEnteredAtTick: 0,
      status: 'in_progress',
      choiceHistory: [],
    }
    const world = makeTestWorld({
      tick: 36,
      realms: new Map([['realm_qin', makeRealm()]]),
      rulers: new Map([['realm_qin', makeRuler('builder')]]),
      generals: new Map([['gen_reformer', makeReformer()]]),
      reformStates: new Map([['realm_qin', reformState]]),
      playerRealmId: 'realm_other',
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [def])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.currentStageId).toBe('stage2')
    expect(state?.choiceHistory.length).toBe(1)
  })

  it('does NOT auto-advance reform stage for player realm even when threshold reached', () => {
    const def: ReformDefinition = {
      id: 'multi_stage',
      displayName: 'Multi',
      displayNameZh: '多',
      trigger: { kind: 'realm.id', value: 'realm_qin' },
      oneShot: true,
      stages: [
        {
          id: 'stage1',
          textZh: 'Stage 1',
          choices: [
            { id: 'go', labelZh: 'Go', effects: [], outcome: 'continue', nextStageId: 'stage2' },
          ],
          advanceAfterMonths: 12,
        },
        {
          id: 'stage2',
          textZh: 'Stage 2',
          choices: [
            { id: 'finish', labelZh: 'Finish', effects: [], outcome: 'success' },
          ],
          advanceAfterMonths: 12,
        },
      ],
      successTrait: 'shang_yang_reform_done',
      failureTrait: 'reform_failed_scar',
    }
    const reformState: ReformState = {
      realmId: 'realm_qin',
      reformId: 'multi_stage',
      currentStageId: 'stage1',
      startedAtTick: 0,
      stageEnteredAtTick: 0,
      status: 'in_progress',
      choiceHistory: [],
    }
    const world = makeTestWorld({
      tick: 36,
      realms: new Map([['realm_qin', makeRealm()]]),
      rulers: new Map([['realm_qin', makeRuler('builder')]]),
      generals: new Map([['gen_reformer', makeReformer()]]),
      reformStates: new Map([['realm_qin', reformState]]),
      playerRealmId: 'realm_qin',
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [def])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.currentStageId).toBe('stage1')
    expect(state?.choiceHistory.length).toBe(0)
    expect(state?.status).toBe('in_progress')
  })
})

describe('reformPhase: determinism', () => {
  it('produces identical results for the same seed and inputs', () => {
    const world = makeWorldWithBuilder()
    const defs = [makeSimpleReformDef()]
    const a = reformPhase(world, { seed: 1, counter: 0 }, defs)
    const b = reformPhase(world, { seed: 1, counter: 0 }, defs)
    expect(a.world.reformStates).toEqual(b.world.reformStates)
    expect(a.nextRng).toEqual(b.nextRng)
    expect(a.events).toEqual(b.events)
  })

  it('returns same world reference and unchanged RNG when no realms eligible', () => {
    const world = makeTestWorld({
      realms: new Map([['realm_qin', makeRealm()]]),
      rulers: new Map([['realm_qin', makeRuler('steward')]]),
      playerRealmId: 'realm_other',
    })
    const rng = { seed: 7, counter: 3 }
    const a = reformPhase(world, rng, [makeSimpleReformDef()])
    const b = reformPhase(world, rng, [makeSimpleReformDef()])
    expect(a.events).toEqual(b.events)
    expect(a.nextRng).toEqual(b.nextRng)
  })
})
