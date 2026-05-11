import { describe, expect, it } from 'vitest'

import { evaluateStepPredicate } from '../predicate'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { warKey } from '~/engine/wars/wars'
import type {
  Army,
  ArmyId,
  PanelId,
  Realm,
  RealmId,
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

function makeTutorialState(overrides: Partial<TutorialState> = {}): TutorialState {
  return {
    currentStep: null,
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
    tutorialState: makeTutorialState(),
    ...overrides,
  })
}

function makeRealm(overrides: Partial<Realm> & { id: RealmId }): Realm {
  return {
    displayName: overrides.id,
    fullTitle: overrides.id,
    color: '#000000',
    capital: 'site_unused',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 0 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
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
    economy: {
      population: 100,
      households: 25,
      taxBase: 100,
      foodProduction: 100,
    },
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

describe('evaluateStepPredicate: panel-tour', () => {
  it('returns false when fewer than 3 panels have been opened', () => {
    const world = makeTutorialWorld({
      tutorialState: makeTutorialState({
        panelsOpened: new Set<PanelId>(['realm', 'army']),
      }),
    })
    expect(evaluateStepPredicate(world, 'panel-tour')).toBe(false)
  })

  it('returns true when all 3 target panels have been opened', () => {
    const world = makeTutorialWorld({
      tutorialState: makeTutorialState({
        panelsOpened: new Set<PanelId>(['realm', 'army', 'diplomacy']),
      }),
    })
    expect(evaluateStepPredicate(world, 'panel-tour')).toBe(true)
  })
})

describe('evaluateStepPredicate: diplomacy-ju', () => {
  it('returns false when diplomacy-ju has not been recorded as completed', () => {
    const world = makeTutorialWorld()
    expect(evaluateStepPredicate(world, 'diplomacy-ju')).toBe(false)
  })

  it('returns true when diplomacy-ju has been recorded in completedSteps', () => {
    const world = makeTutorialWorld({
      tutorialState: makeTutorialState({
        completedSteps: new Set<TutorialStepId>(['diplomacy-ju']),
      }),
    })
    expect(evaluateStepPredicate(world, 'diplomacy-ju')).toBe(true)
  })
})

describe('evaluateStepPredicate: declare-march', () => {
  it('returns false when there is no war declared between Qin and Shu', () => {
    const armies = new Map<ArmyId, Army>([
      ['army_1', makeArmy('army_1', QIN, 'site_jiameng')],
    ])
    const world = makeTutorialWorld({ armies })
    expect(evaluateStepPredicate(world, 'declare-march')).toBe(false)
  })

  it('returns true when war is declared and a Qin army stands on a Shu-owned site', () => {
    const wars = new Map<WarKey, WarState>([[warKey(QIN, SHU), makeWarState()]])
    const sites = new Map<SiteId, Site>([
      ['site_jiameng', makeSite('site_jiameng', SHU)],
    ])
    const armies = new Map<ArmyId, Army>([
      ['army_1', makeArmy('army_1', QIN, 'site_jiameng')],
    ])
    const world = makeTutorialWorld({ wars, sites, armies })
    expect(evaluateStepPredicate(world, 'declare-march')).toBe(true)
  })
})

describe('evaluateStepPredicate: siege-capture', () => {
  it('returns false when neither Jiameng nor Chengdu are owned by Qin', () => {
    const sites = new Map<SiteId, Site>([
      ['site_jiameng', makeSite('site_jiameng', SHU)],
      ['site_chengdu', makeSite('site_chengdu', SHU)],
    ])
    const world = makeTutorialWorld({ sites })
    expect(evaluateStepPredicate(world, 'siege-capture')).toBe(false)
  })

  it('returns true when Qin has captured Jiameng', () => {
    const sites = new Map<SiteId, Site>([
      ['site_jiameng', makeSite('site_jiameng', QIN)],
      ['site_chengdu', makeSite('site_chengdu', SHU)],
    ])
    const world = makeTutorialWorld({ sites })
    expect(evaluateStepPredicate(world, 'siege-capture')).toBe(true)
  })
})

describe('evaluateStepPredicate: peace-annex', () => {
  it('returns false when the Qin-Shu war is still active', () => {
    const wars = new Map<WarKey, WarState>([[warKey(QIN, SHU), makeWarState()]])
    const realms = new Map<RealmId, Realm>([
      [SHU, makeRealm({ id: SHU, status: 'deactivated' })],
    ])
    const world = makeTutorialWorld({ wars, realms })
    expect(evaluateStepPredicate(world, 'peace-annex')).toBe(false)
  })

  it('returns true when Qin-Shu war ended and Shu is deactivated', () => {
    const realms = new Map<RealmId, Realm>([
      [SHU, makeRealm({ id: SHU, status: 'deactivated' })],
    ])
    const world = makeTutorialWorld({ realms })
    expect(evaluateStepPredicate(world, 'peace-annex')).toBe(true)
  })
})
