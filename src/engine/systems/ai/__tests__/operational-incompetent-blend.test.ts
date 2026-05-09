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
import { M8_1_OPERATIONAL_WEIGHTS } from '~/content/m2/balance/m8_1'
import { createInitialRng } from '~/engine/random'
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
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeSite(id: string, ownerId: RealmId): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
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

function strategicPlan(): StrategicPlan {
  return {
    targetSiteId: 'site_enemy',
    mainEnemyRealmId: enemyRealmId,
    mainAllyRealmId: allyRealmId,
    reformIntentId: null,
    decidedAtTick: 1,
    decidedForYearBC: 300,
  }
}

function aiState(plan: StrategicPlan): AIState {
  return { strategic: plan, operational: [] }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    date: { yearBC: 300, season: 'spring', month: 1, xun: 'shang' },
    tick: 9,
    difficulty: 'hero',
    playerRealmId,
    realms: new Map([
      [playerRealmId, makeRealm(playerRealmId, 'site_player')],
      [aiRealmId, makeRealm(aiRealmId, 'site_ai')],
      [enemyRealmId, makeRealm(enemyRealmId, 'site_enemy')],
      [allyRealmId, makeRealm(allyRealmId, 'site_ally')],
    ]),
    sites: new Map([
      ['site_player', makeSite('site_player', playerRealmId)],
      ['site_ai', makeSite('site_ai', aiRealmId)],
      ['site_enemy', makeSite('site_enemy', enemyRealmId)],
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

function directivePriority(world: World, kind: 'declare_war' | 'diplomacy'): number {
  const directive = world.aiState.get(aiRealmId)?.operational.find((item) => item.kind === kind)
  expect(directive).toBeDefined()
  return directive?.priority ?? 0
}

describe('operational incompetent blend', () => {
  it('keeps hero difficulty at pure archetype weights', () => {
    const result = aiOperationalStep(baseWorld({ difficulty: 'hero' }), createInitialRng(1))
    const weights = M8_1_OPERATIONAL_WEIGHTS.conqueror

    expect(directivePriority(result.world, 'declare_war')).toBe(weights.warDeclarationBias * 10)
    expect(directivePriority(result.world, 'diplomacy')).toBe(weights.diplomacyInitiative * 10)
  })

  it('moves weak difficulty priorities closer to incompetent than hero does', () => {
    const hero = aiOperationalStep(baseWorld({ difficulty: 'hero' }), createInitialRng(1))
    const weak = aiOperationalStep(baseWorld({ difficulty: 'weak' }), createInitialRng(1))
    const incompetent = M8_1_OPERATIONAL_WEIGHTS.incompetent

    const heroWarDistance = Math.abs(directivePriority(hero.world, 'declare_war') - incompetent.warDeclarationBias * 10)
    const weakWarDistance = Math.abs(directivePriority(weak.world, 'declare_war') - incompetent.warDeclarationBias * 10)
    const heroDiplomacyDistance = Math.abs(directivePriority(hero.world, 'diplomacy') - incompetent.diplomacyInitiative * 10)
    const weakDiplomacyDistance = Math.abs(directivePriority(weak.world, 'diplomacy') - incompetent.diplomacyInitiative * 10)

    expect(directivePriority(weak.world, 'declare_war')).toBeCloseTo(22)
    expect(directivePriority(weak.world, 'diplomacy')).toBeCloseTo(7)
    expect(weakWarDistance).toBeLessThan(heroWarDistance)
    expect(weakDiplomacyDistance).toBeLessThan(heroDiplomacyDistance)
  })
})
