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
  ScenarioId,
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

const ALL_STEPS: readonly TutorialStepId[] = [
  'panel-tour',
  'diplomacy-ju',
  'declare-march',
  'siege-capture',
  'peace-annex',
]

function baseTutorialState(): TutorialState {
  return {
    currentStep: null,
    completedSteps: new Set<TutorialStepId>(),
    startedAt: { yearBC: 316, season: 'spring', month: 1, xun: 'shang' },
    dismissedStepHints: new Set<TutorialStepId>(),
    panelsOpened: new Set<PanelId>(),
    timeoutHintShown: false,
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

function worldForStep(stepId: TutorialStepId, scenarioId: ScenarioId): World {
  switch (stepId) {
    case 'panel-tour':
      return makeEmptyWorld({
        scenarioId,
        playerRealmId: QIN,
        tutorialState: {
          ...baseTutorialState(),
          panelsOpened: new Set<PanelId>(['realm', 'army', 'diplomacy']),
        },
      })

    case 'diplomacy-ju':
      return makeEmptyWorld({
        scenarioId,
        playerRealmId: QIN,
        tutorialState: {
          ...baseTutorialState(),
          completedSteps: new Set<TutorialStepId>(['diplomacy-ju']),
        },
      })

    case 'declare-march': {
      const wars = new Map<WarKey, WarState>([[warKey(QIN, SHU), makeWarState()]])
      const sites = new Map<SiteId, Site>([['site_jiameng', makeSite('site_jiameng', SHU)]])
      const armies = new Map<ArmyId, Army>([['army_1', makeArmy('army_1', QIN, 'site_jiameng')]])
      return makeEmptyWorld({
        scenarioId,
        playerRealmId: QIN,
        tutorialState: baseTutorialState(),
        wars,
        sites,
        armies,
      })
    }

    case 'siege-capture': {
      const sites = new Map<SiteId, Site>([['site_jiameng', makeSite('site_jiameng', QIN)]])
      return makeEmptyWorld({
        scenarioId,
        playerRealmId: QIN,
        tutorialState: baseTutorialState(),
        sites,
      })
    }

    case 'peace-annex': {
      const realms = new Map<RealmId, Realm>([[SHU, makeRealm(SHU, 'deactivated')]])
      return makeEmptyWorld({
        scenarioId,
        playerRealmId: QIN,
        tutorialState: baseTutorialState(),
        realms,
      })
    }
  }
}

describe('evaluateStepPredicate: cross-scenario guard', () => {
  it.each(ALL_STEPS)('returns false for step %s when scenarioId is m1', (step) => {
    const world = worldForStep(step, 'm1')
    expect(evaluateStepPredicate(world, step)).toBe(false)
  })

  it.each(ALL_STEPS)('returns false for step %s when scenarioId is m9', (step) => {
    const world = worldForStep(step, 'm9')
    expect(evaluateStepPredicate(world, step)).toBe(false)
  })

  it.each(ALL_STEPS)('returns true for step %s as positive control in tutorial scenario', (step) => {
    const world = worldForStep(step, 'tutorial')
    expect(evaluateStepPredicate(world, step)).toBe(true)
  })
})
