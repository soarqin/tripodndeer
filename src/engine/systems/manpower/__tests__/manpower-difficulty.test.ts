import { describe, expect, it } from 'vitest'

import { manpowerTick } from '../manpower'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { DifficultyTier, GameDate, Realm, RNGState, World } from '~/shared/types'

const date: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const rng: RNGState = { seed: 42, counter: 0 }

function makeRealm(id: string, manpowerPool: number, manpowerCap: number): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    stats: {
      manpowerPool,
      manpowerCap,
      warWeariness: 0,
    },
  }
}

function makeWorldAtDifficulty(difficulty: DifficultyTier): World {
  return makeEmptyWorld({
    date,
    tick: 0,
    realms: new Map([
      ['realm_player', makeRealm('realm_player', 0, 80000)],
      ['realm_ai', makeRealm('realm_ai', 0, 80000)],
    ]),
    playerRealmId: 'realm_player',
    difficulty,
    rngState: rng,
  })
}

function manpowerDelta(before: World, after: World, realmId: string): number {
  const beforePool = before.realms.get(realmId)?.stats?.manpowerPool ?? 0
  const afterPool = after.realms.get(realmId)?.stats?.manpowerPool ?? 0
  return afterPool - beforePool
}

describe('manpowerTick difficulty multiplier', () => {
  it('hero: AI and player regen unchanged (multiplier = 1.0)', () => {
    const world = makeWorldAtDifficulty('hero')
    const result = manpowerTick(world, rng)

    const aiDelta = manpowerDelta(world, result.world, 'realm_ai')
    const playerDelta = manpowerDelta(world, result.world, 'realm_player')

    expect(aiDelta).toBe(playerDelta)
    expect(aiDelta).toBeGreaterThan(0)
  })

  it('sage: AI manpower regen ratio ≈ 1.20 vs hero', () => {
    const heroWorld = makeWorldAtDifficulty('hero')
    const sageWorld = makeWorldAtDifficulty('sage')

    const heroAi = manpowerDelta(heroWorld, manpowerTick(heroWorld, rng).world, 'realm_ai')
    const sageAi = manpowerDelta(sageWorld, manpowerTick(sageWorld, rng).world, 'realm_ai')

    expect(sageAi / heroAi).toBeCloseTo(1.20, 2)
  })

  it('sage: player regen unchanged (playerManpowerMul = 1.0)', () => {
    const heroWorld = makeWorldAtDifficulty('hero')
    const sageWorld = makeWorldAtDifficulty('sage')

    const heroPlayer = manpowerDelta(heroWorld, manpowerTick(heroWorld, rng).world, 'realm_player')
    const sagePlayer = manpowerDelta(sageWorld, manpowerTick(sageWorld, rng).world, 'realm_player')

    expect(sagePlayer).toBe(heroPlayer)
  })

  it('weak: player manpower regen ratio ≈ 1.10 vs hero', () => {
    const heroWorld = makeWorldAtDifficulty('hero')
    const weakWorld = makeWorldAtDifficulty('weak')

    const heroPlayer = manpowerDelta(heroWorld, manpowerTick(heroWorld, rng).world, 'realm_player')
    const weakPlayer = manpowerDelta(weakWorld, manpowerTick(weakWorld, rng).world, 'realm_player')

    expect(weakPlayer / heroPlayer).toBeCloseTo(1.10, 2)
  })

  it('weak: AI regen unchanged (aiManpowerMul = 1.0)', () => {
    const heroWorld = makeWorldAtDifficulty('hero')
    const weakWorld = makeWorldAtDifficulty('weak')

    const heroAi = manpowerDelta(heroWorld, manpowerTick(heroWorld, rng).world, 'realm_ai')
    const weakAi = manpowerDelta(weakWorld, manpowerTick(weakWorld, rng).world, 'realm_ai')

    expect(weakAi).toBe(heroAi)
  })

  it('multiplier does not affect manpowerCap (only regen rate)', () => {
    const sageWorld = makeWorldAtDifficulty('sage')
    const result = manpowerTick(sageWorld, rng)

    expect(result.world.realms.get('realm_ai')?.stats?.manpowerCap).toBe(80000)
    expect(result.world.realms.get('realm_player')?.stats?.manpowerCap).toBe(80000)
  })
})
