import { describe, expect, it } from 'vitest'

import { tutorialPhase } from '../tutorial-phase'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { warKey } from '~/engine/wars/wars'
import type {
  Army,
  ArmyId,
  PanelId,
  Realm,
  RealmId,
  RNGState,
  Site,
  SiteId,
  TutorialState,
  TutorialStepId,
  WarKey,
  WarState,
  World,
} from '~/shared/types'

const QIN: RealmId = 'realm_qin_tutorial'
const SHU: RealmId = 'realm_shu_tutorial'
const RNG: RNGState = { seed: 42, counter: 7 }

function makeTutorialState(overrides: Partial<TutorialState> = {}): TutorialState {
  return {
    currentStep: 'panel-tour',
    completedSteps: new Set<TutorialStepId>(),
    startedAt: { yearBC: 316, season: 'spring', month: 1, xun: 'shang' },
    dismissedStepHints: new Set<TutorialStepId>(),
    panelsOpened: new Set<PanelId>(),
    timeoutHintShown: false,
    ...overrides,
  }
}

function makeTutorialWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    scenarioId: 'tutorial',
    playerRealmId: QIN,
    realms: new Map<RealmId, Realm>([
      [QIN, makeRealm(QIN)],
      [SHU, makeRealm(SHU)],
    ]),
    tutorialState: makeTutorialState(),
    ...overrides,
  })
}

function makeRealm(id: RealmId, status?: 'active' | 'deactivated'): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: 'site_unused',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 0 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...(status ? { status } : {}),
  }
}

function makeSite(id: SiteId, ownerId: RealmId | null): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 100, households: 25, taxBase: 100, foodProduction: 100 },
    cultural: 'di_xirong',
    culturalIdentityStrength: 100,
    lastConquestTick: null,
    lowIdentitySinceTick: null,
  }
}

function makeArmy(id: ArmyId, realmId: RealmId, location: SiteId): Army {
  return {
    id,
    realmId,
    manpower: 1000,
    location,
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
  }
}

function makeWarState(): WarState {
  return {
    casusBelli: null,
    declaredAt: { yearBC: 316, season: 'spring', month: 1, xun: 'shang' },
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

describe('tutorialPhase', () => {
  it('is a no-op outside the tutorial scenario', () => {
    const world = makeEmptyWorld({ scenarioId: 'm1', tutorialState: makeTutorialState() })

    const result = tutorialPhase(world, RNG)

    expect(result.world).toBe(world)
    expect(result.nextRng).toBe(RNG)
    expect(result.events).toEqual([])
  })

  it('is a no-op when no tutorial predicates are met', () => {
    const world = makeTutorialWorld()

    const result = tutorialPhase(world, RNG)

    expect(result.world).toBe(world)
    expect(result.nextRng).toBe(RNG)
    expect(result.events).toEqual([])
  })

  it('completes the first met step and advances currentStep', () => {
    const world = makeTutorialWorld({
      tutorialState: makeTutorialState({
        panelsOpened: new Set<PanelId>(['realm', 'army', 'diplomacy']),
      }),
    })

    const result = tutorialPhase(world, RNG)

    expect(result.world.tutorialState?.completedSteps.has('panel-tour')).toBe(true)
    expect(result.world.tutorialState?.currentStep).toBe('diplomacy-ju')
    expect(result.events).toEqual([
      { type: 'TUTORIAL_STEP_COMPLETE', payload: { stepId: 'panel-tour' } },
    ])
    expect(result.nextRng).toBe(RNG)
  })

  it('completes multiple met steps in one tick', () => {
    const wars = new Map<WarKey, WarState>([[warKey(QIN, SHU), makeWarState()]])
    const sites = new Map<SiteId, Site>([
      ['site_jiameng', makeSite('site_jiameng', SHU)],
      ['site_chengdu', makeSite('site_chengdu', QIN)],
    ])
    const armies = new Map<ArmyId, Army>([
      ['army_qin', makeArmy('army_qin', QIN, 'site_jiameng')],
    ])
    const world = makeTutorialWorld({
      wars,
      sites,
      armies,
      tutorialState: makeTutorialState({
        completedSteps: new Set<TutorialStepId>(['diplomacy-ju']),
        currentStep: 'panel-tour',
        panelsOpened: new Set<PanelId>(['realm', 'army', 'diplomacy']),
      }),
    })

    const result = tutorialPhase(world, RNG)

    expect([...result.world.tutorialState!.completedSteps].sort()).toEqual([
      'declare-march',
      'diplomacy-ju',
      'panel-tour',
      'siege-capture',
    ])
    expect(result.world.tutorialState?.currentStep).toBe('peace-annex')
    expect(result.events).toEqual([
      { type: 'TUTORIAL_STEP_COMPLETE', payload: { stepId: 'panel-tour' } },
      { type: 'TUTORIAL_STEP_COMPLETE', payload: { stepId: 'declare-march' } },
      { type: 'TUTORIAL_STEP_COMPLETE', payload: { stepId: 'siege-capture' } },
    ])
  })

  it('emits tutorial completion when the final incomplete step is met', () => {
    const realms = new Map<RealmId, Realm>([[SHU, makeRealm(SHU, 'deactivated')]])
    const world = makeTutorialWorld({
      realms,
      tutorialState: makeTutorialState({
        completedSteps: new Set<TutorialStepId>([
          'panel-tour',
          'diplomacy-ju',
          'declare-march',
          'siege-capture',
        ]),
        currentStep: 'peace-annex',
      }),
    })

    const result = tutorialPhase(world, RNG)

    expect(result.world.tutorialState?.completedSteps.has('peace-annex')).toBe(true)
    expect(result.world.tutorialState?.currentStep).toBeNull()
    expect(result.events).toEqual([
      { type: 'TUTORIAL_STEP_COMPLETE', payload: { stepId: 'peace-annex' } },
      { type: 'TUTORIAL_COMPLETE', payload: {} },
    ])
  })
})
