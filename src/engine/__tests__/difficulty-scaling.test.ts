import { describe, expect, it } from 'vitest'

import { economyPhase } from '~/engine/systems/economy/economy-phase'
import { manpowerTick } from '~/engine/systems/manpower/manpower'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  DifficultyTier,
  GameDate,
  PersonalityArchetype,
  Realm,
  RNGState,
  RulerState,
  Site,
  World,
} from '~/shared/types'
import {
  M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
  M4_HOUSEHOLD_DIVISOR,
} from '~/content/m2/balance'

const SEED: RNGState = { seed: 42, counter: 0 }
const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const TICKS = 12

function makeRealm(id: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 5000, taxRate: 50 },
    traits: [],
    politicalSystem: 'enfeoffment',
    stats: { manpowerPool: 0, manpowerCap: 80000, warWeariness: 0 },
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
    date: DATE,
    tick: 0,
    sites: new Map([
      ['site_player', makeSite('site_player', 'realm_player', 10000)],
      ['site_ai', makeSite('site_ai', 'realm_ai', 10000)],
    ]),
    realms: new Map([
      ['realm_player', makeRealm('realm_player')],
      ['realm_ai', makeRealm('realm_ai')],
    ]),
    rulers: new Map([
      ['realm_player', makeRuler('realm_player', 'incompetent')],
      ['realm_ai', makeRuler('realm_ai', 'incompetent')],
    ]),
    playerRealmId: 'realm_player',
    difficulty,
    rngState: SEED,
  })
}

function runEconomyTicks(world: World, ticks: number): { aiDelta: number; playerDelta: number } {
  let current = world
  for (let i = 0; i < ticks; i++) {
    current = economyPhase(current, current.rngState).world
  }
  const aiBefore = world.realms.get('realm_ai')?.economy.treasury ?? 0
  const aiAfter = current.realms.get('realm_ai')?.economy.treasury ?? 0
  const playerBefore = world.realms.get('realm_player')?.economy.treasury ?? 0
  const playerAfter = current.realms.get('realm_player')?.economy.treasury ?? 0
  return { aiDelta: aiAfter - aiBefore, playerDelta: playerAfter - playerBefore }
}

function runManpowerTicks(world: World, ticks: number): { aiDelta: number; playerDelta: number } {
  let current = world
  for (let i = 0; i < ticks; i++) {
    current = manpowerTick(current, current.rngState).world
  }
  const aiBefore = world.realms.get('realm_ai')?.stats?.manpowerPool ?? 0
  const aiAfter = current.realms.get('realm_ai')?.stats?.manpowerPool ?? 0
  const playerBefore = world.realms.get('realm_player')?.stats?.manpowerPool ?? 0
  const playerAfter = current.realms.get('realm_player')?.stats?.manpowerPool ?? 0
  return { aiDelta: aiAfter - aiBefore, playerDelta: playerAfter - playerBefore }
}

describe('difficulty scaling (12 ticks economy + manpower per tier)', () => {
  describe('hero (baseline) — all multipliers === 1.0', () => {
    it('AI economy delta === player economy delta', () => {
      const world = makeWorldAtDifficulty('hero')
      const economy = runEconomyTicks(world, TICKS)

      expect(economy.aiDelta).toBe(economy.playerDelta)
      expect(economy.aiDelta).toBeGreaterThan(0)
    })

    it('AI manpower delta === player manpower delta', () => {
      const world = makeWorldAtDifficulty('hero')
      const manpower = runManpowerTicks(world, TICKS)

      expect(manpower.aiDelta).toBe(manpower.playerDelta)
      expect(manpower.aiDelta).toBeGreaterThan(0)
    })
  })

  describe('sage — AI economy/manpower ratio ∈ [1.18, 1.22] vs hero', () => {
    it('AI economy ratio in tolerance', () => {
      const heroDelta = runEconomyTicks(makeWorldAtDifficulty('hero'), TICKS).aiDelta
      const sageDelta = runEconomyTicks(makeWorldAtDifficulty('sage'), TICKS).aiDelta
      const ratio = sageDelta / heroDelta

      expect(ratio).toBeGreaterThanOrEqual(1.18)
      expect(ratio).toBeLessThanOrEqual(1.22)
    })

    it('AI manpower ratio in tolerance', () => {
      const heroDelta = runManpowerTicks(makeWorldAtDifficulty('hero'), TICKS).aiDelta
      const sageDelta = runManpowerTicks(makeWorldAtDifficulty('sage'), TICKS).aiDelta
      const ratio = sageDelta / heroDelta

      expect(ratio).toBeGreaterThanOrEqual(1.18)
      expect(ratio).toBeLessThanOrEqual(1.22)
    })

    it('player ratios remain ≈ 1.0', () => {
      const heroEconomy = runEconomyTicks(makeWorldAtDifficulty('hero'), TICKS).playerDelta
      const sageEconomy = runEconomyTicks(makeWorldAtDifficulty('sage'), TICKS).playerDelta
      const heroManpower = runManpowerTicks(makeWorldAtDifficulty('hero'), TICKS).playerDelta
      const sageManpower = runManpowerTicks(makeWorldAtDifficulty('sage'), TICKS).playerDelta

      expect(sageEconomy).toBe(heroEconomy)
      expect(sageManpower).toBe(heroManpower)
    })
  })

  describe('hegemon — AI economy/manpower ratio ∈ [1.08, 1.12] vs hero', () => {
    it('AI economy ratio in tolerance', () => {
      const heroDelta = runEconomyTicks(makeWorldAtDifficulty('hero'), TICKS).aiDelta
      const hegemonDelta = runEconomyTicks(makeWorldAtDifficulty('hegemon'), TICKS).aiDelta
      const ratio = hegemonDelta / heroDelta

      expect(ratio).toBeGreaterThanOrEqual(1.08)
      expect(ratio).toBeLessThanOrEqual(1.12)
    })

    it('AI manpower ratio in tolerance', () => {
      const heroDelta = runManpowerTicks(makeWorldAtDifficulty('hero'), TICKS).aiDelta
      const hegemonDelta = runManpowerTicks(makeWorldAtDifficulty('hegemon'), TICKS).aiDelta
      const ratio = hegemonDelta / heroDelta

      expect(ratio).toBeGreaterThanOrEqual(1.08)
      expect(ratio).toBeLessThanOrEqual(1.12)
    })

    it('player ratios remain ≈ 1.0', () => {
      const heroEconomy = runEconomyTicks(makeWorldAtDifficulty('hero'), TICKS).playerDelta
      const hegemonEconomy = runEconomyTicks(makeWorldAtDifficulty('hegemon'), TICKS).playerDelta
      const heroManpower = runManpowerTicks(makeWorldAtDifficulty('hero'), TICKS).playerDelta
      const hegemonManpower = runManpowerTicks(makeWorldAtDifficulty('hegemon'), TICKS).playerDelta

      expect(hegemonEconomy).toBe(heroEconomy)
      expect(hegemonManpower).toBe(heroManpower)
    })
  })

  describe('weak — player economy/manpower ratio ∈ [1.08, 1.12] vs hero', () => {
    it('player economy ratio in tolerance', () => {
      const heroDelta = runEconomyTicks(makeWorldAtDifficulty('hero'), TICKS).playerDelta
      const weakDelta = runEconomyTicks(makeWorldAtDifficulty('weak'), TICKS).playerDelta
      const ratio = weakDelta / heroDelta

      expect(ratio).toBeGreaterThanOrEqual(1.08)
      expect(ratio).toBeLessThanOrEqual(1.12)
    })

    it('player manpower ratio in tolerance', () => {
      const heroDelta = runManpowerTicks(makeWorldAtDifficulty('hero'), TICKS).playerDelta
      const weakDelta = runManpowerTicks(makeWorldAtDifficulty('weak'), TICKS).playerDelta
      const ratio = weakDelta / heroDelta

      expect(ratio).toBeGreaterThanOrEqual(1.08)
      expect(ratio).toBeLessThanOrEqual(1.12)
    })

    it('AI ratios remain ≈ 1.0', () => {
      const heroEconomy = runEconomyTicks(makeWorldAtDifficulty('hero'), TICKS).aiDelta
      const weakEconomy = runEconomyTicks(makeWorldAtDifficulty('weak'), TICKS).aiDelta
      const heroManpower = runManpowerTicks(makeWorldAtDifficulty('hero'), TICKS).aiDelta
      const weakManpower = runManpowerTicks(makeWorldAtDifficulty('weak'), TICKS).aiDelta

      expect(weakEconomy).toBe(heroEconomy)
      expect(weakManpower).toBe(heroManpower)
    })
  })

  describe('common — same multipliers as hero (only AI quality differs)', () => {
    it('all economy/manpower deltas equal hero', () => {
      const heroEconomy = runEconomyTicks(makeWorldAtDifficulty('hero'), TICKS)
      const commonEconomy = runEconomyTicks(makeWorldAtDifficulty('common'), TICKS)
      const heroManpower = runManpowerTicks(makeWorldAtDifficulty('hero'), TICKS)
      const commonManpower = runManpowerTicks(makeWorldAtDifficulty('common'), TICKS)

      expect(commonEconomy.aiDelta).toBe(heroEconomy.aiDelta)
      expect(commonEconomy.playerDelta).toBe(heroEconomy.playerDelta)
      expect(commonManpower.aiDelta).toBe(heroManpower.aiDelta)
      expect(commonManpower.playerDelta).toBe(heroManpower.playerDelta)
    })
  })
})
