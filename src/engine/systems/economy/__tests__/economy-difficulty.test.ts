import { describe, expect, it } from 'vitest'

import { economyPhase } from '../economy-phase'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { DifficultyTier, GameDate, PersonalityArchetype, Realm, RNGState, RulerState, Site, World } from '~/shared/types'
import {
  M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
  M4_HOUSEHOLD_DIVISOR,
} from '~/content/m2/balance'

const date: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const rng: RNGState = { seed: 42, counter: 0 }

function makeRealm(id: string, treasury: number, taxRate: number): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury, foodStores: 5000, taxRate },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeSite(id: string, ownerId: string, population: number): Site {
  const households = Math.floor(population / M4_HOUSEHOLD_DIVISOR)
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: {
      population,
      households,
      taxBase: households,
      foodProduction: households * M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
    },
  }
}

function makeRuler(realmId: string, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId: `${realmId}_ruler`,
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

function makeWorldAtDifficulty(difficulty: DifficultyTier): World {
  return makeEmptyWorld({
    date,
    tick: 0,
    sites: new Map([
      ['site_player', makeSite('site_player', 'realm_player', 10000)],
      ['site_ai', makeSite('site_ai', 'realm_ai', 10000)],
    ]),
    realms: new Map([
      ['realm_player', makeRealm('realm_player', 1000, 50)],
      ['realm_ai', makeRealm('realm_ai', 1000, 50)],
    ]),
    rulers: new Map([
      ['realm_player', makeRuler('realm_player', 'incompetent')],
      ['realm_ai', makeRuler('realm_ai', 'incompetent')],
    ]),
    playerRealmId: 'realm_player',
    difficulty,
    rngState: rng,
  })
}

function treasuryDelta(before: World, after: World, realmId: string): number {
  const beforeT = before.realms.get(realmId)?.economy.treasury ?? 0
  const afterT = after.realms.get(realmId)?.economy.treasury ?? 0
  return afterT - beforeT
}

describe('economyPhase difficulty multiplier', () => {
  it('hero: AI and player income unchanged (multiplier = 1.0)', () => {
    const world = makeWorldAtDifficulty('hero')
    const result = economyPhase(world, rng)

    const aiDelta = treasuryDelta(world, result.world, 'realm_ai')
    const playerDelta = treasuryDelta(world, result.world, 'realm_player')

    expect(aiDelta).toBe(playerDelta)
    expect(aiDelta).toBeGreaterThan(0)
  })

  it('sage: AI income ratio ≈ 1.20 vs hero', () => {
    const heroWorld = makeWorldAtDifficulty('hero')
    const sageWorld = makeWorldAtDifficulty('sage')

    const heroAi = treasuryDelta(heroWorld, economyPhase(heroWorld, rng).world, 'realm_ai')
    const sageAi = treasuryDelta(sageWorld, economyPhase(sageWorld, rng).world, 'realm_ai')

    expect(sageAi / heroAi).toBeCloseTo(1.20, 2)
  })

  it('sage: player income unchanged (playerEconomyMul = 1.0)', () => {
    const heroWorld = makeWorldAtDifficulty('hero')
    const sageWorld = makeWorldAtDifficulty('sage')

    const heroPlayer = treasuryDelta(heroWorld, economyPhase(heroWorld, rng).world, 'realm_player')
    const sagePlayer = treasuryDelta(sageWorld, economyPhase(sageWorld, rng).world, 'realm_player')

    expect(sagePlayer).toBe(heroPlayer)
  })

  it('weak: player income ratio ≈ 1.10 vs hero', () => {
    const heroWorld = makeWorldAtDifficulty('hero')
    const weakWorld = makeWorldAtDifficulty('weak')

    const heroPlayer = treasuryDelta(heroWorld, economyPhase(heroWorld, rng).world, 'realm_player')
    const weakPlayer = treasuryDelta(weakWorld, economyPhase(weakWorld, rng).world, 'realm_player')

    expect(weakPlayer / heroPlayer).toBeCloseTo(1.10, 2)
  })

  it('weak: AI income unchanged (aiEconomyMul = 1.0)', () => {
    const heroWorld = makeWorldAtDifficulty('hero')
    const weakWorld = makeWorldAtDifficulty('weak')

    const heroAi = treasuryDelta(heroWorld, economyPhase(heroWorld, rng).world, 'realm_ai')
    const weakAi = treasuryDelta(weakWorld, economyPhase(weakWorld, rng).world, 'realm_ai')

    expect(weakAi).toBe(heroAi)
  })
})
