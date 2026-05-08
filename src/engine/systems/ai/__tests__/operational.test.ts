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
    aiPersonality: 'cautious',
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
    tick: 9,
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

describe('aiOperationalStep cadence', () => {
  it('skips non-shang xun without consuming RNG', () => {
    const world = baseWorld({ date: { yearBC: 300, season: 'spring', month: 1, xun: 'zhong' } })
    const rng = createInitialRng(1)

    const result = aiOperationalStep(world, rng)

    expect(result).toEqual({ world, nextRng: rng, events: [] })
  })
})

describe('aiOperationalStep directives', () => {
  it('generates top strategic directives on monthly gate pass', () => {
    const result = aiOperationalStep(baseWorld(), createInitialRng(1))

    expect(result.world.aiState.get(aiRealmId)?.operational).toEqual([
      expect.objectContaining({ kind: 'declare_war', targetRealmId: enemyRealmId, priority: 30 }),
      expect.objectContaining({ kind: 'diplomacy', targetRealmId: allyRealmId, priority: 5 }),
    ])
    expect(result.nextRng.counter).toBeGreaterThan(0)
  })

  it('generates dispatch directives only while at war', () => {
    const world = baseWorld({ wars: declareWar(new Map(), aiRealmId, enemyRealmId) })

    const result = aiOperationalStep(world, createInitialRng(1))

    expect(result.world.aiState.get(aiRealmId)?.operational).toEqual([
      expect.objectContaining({ kind: 'dispatch_army', targetSiteId: 'site_enemy', priority: 30 }),
      expect.objectContaining({ kind: 'diplomacy', targetRealmId: allyRealmId, priority: 5 }),
    ])
  })

  it('retains active directives and drops expired directives', () => {
    const world = baseWorld({
      aiState: new Map([[
        aiRealmId,
        {
          strategic: strategicPlan({ mainAllyRealmId: null }),
          operational: [
            {
              id: 'expired',
              kind: 'diplomacy',
              priority: 99,
              targetRealmId: allyRealmId,
              createdAtTick: 1,
              expiresAtTick: 8,
            },
            {
              id: 'active',
              kind: 'diplomacy',
              priority: 7,
              targetRealmId: 'realm_other',
              createdAtTick: 1,
              expiresAtTick: 9,
            },
          ],
        },
      ]]),
    })

    const result = aiOperationalStep(world, createInitialRng(1))
    const directives = result.world.aiState.get(aiRealmId)?.operational ?? []

    expect(directives.map((directive) => directive.id)).toContain('active')
    expect(directives.map((directive) => directive.id)).not.toContain('expired')
    expect(directives.map((directive) => directive.kind)).toContain('declare_war')
  })

  it('keeps action rate near the 20 percent gate over 100 realm-months', () => {
    let rng = createInitialRng(2)
    let generated = 0

    for (let i = 0; i < 100; i += 1) {
      const result = aiOperationalStep(baseWorld({ tick: i }), rng)
      rng = result.nextRng
      if ((result.world.aiState.get(aiRealmId)?.operational.length ?? 0) > 0) generated += 1
    }

    expect(generated).toBeGreaterThanOrEqual(10)
    expect(generated).toBeLessThanOrEqual(35)
  })
})
