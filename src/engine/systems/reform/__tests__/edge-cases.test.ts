import { describe, expect, it } from 'vitest'

import { reformPhase } from '../reform-phase'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { warKey } from '~/engine/wars/wars'
import type {
  General,
  PersonalityArchetype,
  Realm,
  ReformDefinition,
  ReformState,
  RulerState,
  WarState,
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
    personalityDims: {
      expansionDrive: 0.5,
      diplomaticTrust: 0.5,
      caution: 0.5,
      honor: 0.5,
      vindictiveness: 0.5,
      reformInclination: 0.5,
      patience: 0.5,
      preferredStrategy: 'diplomatic',
    },
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

function makeReformDef(idOverride?: string): ReformDefinition {
  return {
    id: idOverride ?? 'test_reform',
    displayName: 'Test',
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

function makeWar(): WarState {
  return {
    casusBelli: null,
    declaredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

function makeActiveReformWorld(opts: {
  tick?: number
  generals?: Map<string, General>
  realms?: Map<string, Realm>
  rulers?: Map<string, RulerState>
  wars?: Map<string, WarState>
  stageEnteredAtTick?: number
} = {}): World {
  const reformState: ReformState = {
    realmId: 'realm_qin',
    reformId: 'test_reform',
    currentStageId: 'stage1',
    startedAtTick: 0,
    stageEnteredAtTick: opts.stageEnteredAtTick ?? 0,
    status: 'in_progress',
    choiceHistory: [],
  }
  return makeEmptyWorld({
    tick: opts.tick ?? 0,
    realms: opts.realms ?? new Map([['realm_qin', makeRealm()]]),
    rulers: opts.rulers ?? new Map([['realm_qin', makeRuler('builder')]]),
    generals: opts.generals ?? new Map([['gen_reformer', makeReformer()]]),
    wars: opts.wars ?? new Map(),
    reformStates: new Map([['realm_qin', reformState]]),
    playerRealmId: 'realm_other',
  })
}

describe('EC1: reformer dies mid-reform', () => {
  it('pauses reform within grace period when reformer is removed', () => {
    const world = makeActiveReformWorld({
      tick: 36,
      generals: new Map(),
      stageEnteredAtTick: 0,
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeReformDef()])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.status).toBe('paused')
    expect(result.world.realms.get('realm_qin')?.traits ?? []).not.toContain('reform_failed_scar')
  })

  it('fails reform with reform_failed_scar trait once grace period elapsed', () => {
    const world = makeActiveReformWorld({
      tick: 80,
      generals: new Map(),
      stageEnteredAtTick: 0,
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeReformDef()])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.status).toBe('completed_failure')
    expect(result.world.realms.get('realm_qin')?.traits).toContain('reform_failed_scar')
  })
})

describe('EC2: war breaks out mid-reform', () => {
  it('reform continues regardless of new war (no-active-war is trigger predicate, not runtime)', () => {
    const wars = new Map<string, WarState>([
      [warKey('realm_qin', 'realm_zhao'), makeWar()],
    ])
    const world = makeActiveReformWorld({ wars })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeReformDef()])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.status).toBe('in_progress')
    expect(state?.reformId).toBe('test_reform')
  })
})

describe('EC3: ruler dies mid-reform', () => {
  it('reform continues under heir with different personality', () => {
    const stewardRulers = new Map([['realm_qin', makeRuler('steward')]])
    const world = makeActiveReformWorld({ rulers: stewardRulers })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeReformDef()])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.status).toBe('in_progress')
    expect(state?.reformId).toBe('test_reform')
  })

  it('reform continues even when ruler is missing entirely', () => {
    const world = makeActiveReformWorld({ rulers: new Map() })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeReformDef()])
    const state = result.world.reformStates.get('realm_qin')
    expect(state?.status).toBe('in_progress')
  })
})

describe('EC4: realm conquered mid-reform', () => {
  it('after conquest cleanup, reformStates does not contain conquered realmId', () => {
    let world = makeActiveReformWorld()
    expect(world.reformStates.has('realm_qin')).toBe(true)

    const realmsAfter = new Map(world.realms)
    realmsAfter.delete('realm_qin')
    const reformStatesAfter = new Map(world.reformStates)
    reformStatesAfter.delete('realm_qin')
    world = { ...world, realms: realmsAfter, reformStates: reformStatesAfter }

    expect(world.realms.has('realm_qin')).toBe(false)
    expect(world.reformStates.has('realm_qin')).toBe(false)

    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeReformDef()])
    expect(result.events).toEqual([])
    expect(result.world.reformStates.has('realm_qin')).toBe(false)
  })

  it('reformPhase tolerates orphan reformState when realm is missing', () => {
    let world = makeActiveReformWorld()
    const realmsAfter = new Map(world.realms)
    realmsAfter.delete('realm_qin')
    world = { ...world, realms: realmsAfter }

    expect(() =>
      reformPhase(world, { seed: 1, counter: 0 }, [makeReformDef()]),
    ).not.toThrow()
  })
})

describe('EC5: two reforms satisfy trigger simultaneously', () => {
  it('only the alphabetically first reform is started', () => {
    const world = makeEmptyWorld({
      realms: new Map([['realm_qin', makeRealm()]]),
      rulers: new Map([['realm_qin', makeRuler('builder')]]),
      playerRealmId: 'realm_other',
    })
    const defAlpha = makeReformDef('reform_alpha')
    const defBeta = makeReformDef('reform_beta')
    const result = reformPhase(world, { seed: 1, counter: 0 }, [defBeta, defAlpha])
    const state = result.world.reformStates.get('realm_qin')
    expect(state).toBeDefined()
    expect(state?.reformId).toBe('reform_alpha')
    expect(result.events.filter((e) => e.type === 'reformStarted')).toHaveLength(1)
  })
})

describe('EC6: reform_failed_scar blocks new reform', () => {
  it('realm with scar trait + reformer + builder ruler: AI trigger skipped', () => {
    const world = makeEmptyWorld({
      realms: new Map([['realm_qin', makeRealm({ traits: ['reform_failed_scar'] })]]),
      rulers: new Map([['realm_qin', makeRuler('builder')]]),
      generals: new Map([['gen_reformer', makeReformer()]]),
      playerRealmId: 'realm_other',
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeReformDef()])
    expect(result.world.reformStates.has('realm_qin')).toBe(false)
    expect(result.events).toEqual([])
  })

  it('removing scar trait restores AI trigger eligibility', () => {
    const world = makeEmptyWorld({
      realms: new Map([['realm_qin', makeRealm({ traits: [] })]]),
      rulers: new Map([['realm_qin', makeRuler('builder')]]),
      generals: new Map([['gen_reformer', makeReformer()]]),
      playerRealmId: 'realm_other',
    })
    const result = reformPhase(world, { seed: 1, counter: 0 }, [makeReformDef()])
    expect(result.world.reformStates.has('realm_qin')).toBe(true)
  })
})
