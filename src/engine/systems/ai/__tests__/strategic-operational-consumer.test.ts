import { describe, expect, it } from 'vitest'
import type {
  PersonalityArchetype,
  Realm,
  RealmId,
  RulerState,
  Site,
  World,
} from '~/shared/types'
import type { AIState, StrategicPlan } from '~/shared/types/ai-state'
import { createInitialRng } from '~/engine/random'
import { declareWar } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { aiOperationalStep } from '../operational'

const playerRealmId = 'realm_player'
const aiRealmId = 'realm_ai'
const enemyRealmId = 'realm_enemy'
const allyRealmId = 'realm_ally'

function makeRealm(id: RealmId, capital: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital,
    initialSites: [capital],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeSite(id: string, ownerId: RealmId, adjacency: readonly string[] = []): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency,
    economy: { population: 1000, households: 100, taxBase: 100, foodProduction: 100 },
  }
}

function makeRuler(realmId: RealmId, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 40,
    lifespan: 70,
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
  }
}

function strategicPlan(overrides: Partial<StrategicPlan> = {}): StrategicPlan {
  return {
    targetSiteId: 'site_enemy',
    mainEnemyRealmId: enemyRealmId,
    mainAllyRealmId: allyRealmId,
    reformIntentId: null,
    decidedAtTick: 1,
    decidedForYearBC: 300,
    ...overrides,
  }
}

function aiState(plan: StrategicPlan | null): AIState {
  return { strategic: plan, operational: [] }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    date: { yearBC: 300, season: 'spring', month: 1, xun: 'shang' },
    tick: 12,
    playerRealmId,
    realms: new Map([
      [playerRealmId, makeRealm(playerRealmId, 'site_player')],
      [aiRealmId, makeRealm(aiRealmId, 'site_ai')],
      [enemyRealmId, makeRealm(enemyRealmId, 'site_enemy')],
      [allyRealmId, makeRealm(allyRealmId, 'site_ally')],
    ]),
    sites: new Map([
      ['site_player', makeSite('site_player', playerRealmId)],
      ['site_ai', makeSite('site_ai', aiRealmId, ['site_enemy'])],
      ['site_enemy', makeSite('site_enemy', enemyRealmId, ['site_ai'])],
      ['site_ally', makeSite('site_ally', allyRealmId)],
    ]),
    rulers: new Map([
      [aiRealmId, makeRuler(aiRealmId, 'conqueror')],
      [enemyRealmId, makeRuler(enemyRealmId, 'steward')],
      [allyRealmId, makeRuler(allyRealmId, 'benevolent')],
    ]),
    aiState: new Map([[aiRealmId, aiState(strategicPlan())]]),
    ...overrides,
  })
}

function directiveKinds(world: World): readonly string[] {
  return (world.aiState.get(aiRealmId)?.operational ?? []).map((directive) => directive.kind)
}

describe('StrategicPlan consumers in aiOperationalStep', () => {
  it('generates declare_war when plan.mainEnemyRealmId is set', () => {
    const result = aiOperationalStep(
      baseWorld({
        aiState: new Map([[
          aiRealmId,
          aiState(strategicPlan({ mainAllyRealmId: null, targetSiteId: null })),
        ]]),
      }),
      createInitialRng(1)
    )

    expect(result.world.aiState.get(aiRealmId)?.operational).toEqual([
      expect.objectContaining({ kind: 'declare_war', targetRealmId: enemyRealmId }),
    ])
  })

  it('generates diplomacy when plan.mainAllyRealmId is set', () => {
    const result = aiOperationalStep(
      baseWorld({
        aiState: new Map([[
          aiRealmId,
          aiState(strategicPlan({ mainEnemyRealmId: null, targetSiteId: null })),
        ]]),
      }),
      createInitialRng(1)
    )

    expect(result.world.aiState.get(aiRealmId)?.operational).toEqual([
      expect.objectContaining({ kind: 'diplomacy', targetRealmId: allyRealmId }),
    ])
  })

  it('does not generate dispatch_army when plan.targetSiteId is null', () => {
    const result = aiOperationalStep(
      baseWorld({
        wars: declareWar(new Map(), aiRealmId, enemyRealmId),
        aiState: new Map([[aiRealmId, aiState(strategicPlan({ targetSiteId: null }))]]),
      }),
      createInitialRng(1)
    )

    expect(directiveKinds(result.world)).not.toContain('dispatch_army')
  })

  it('does not generate operational directives when no Strategic plan exists', () => {
    const result = aiOperationalStep(
      baseWorld({ aiState: new Map([[aiRealmId, aiState(null)]]) }),
      createInitialRng(1)
    )

    expect(result.world.aiState.get(aiRealmId)?.operational).toEqual([])
  })
})
