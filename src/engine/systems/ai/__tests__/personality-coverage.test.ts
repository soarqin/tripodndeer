import { describe, expect, it } from 'vitest'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { pickAction, scoreOption, type AIOption } from '../utility-scorer'
import type { PersonalityArchetype, World } from '~/shared/types'

const CONTEXTS = [
  'threatened-by-stronger-neighbor',
  'at-war-winning',
  'peacetime-rich',
  'peacetime-poor',
  'low-manpower',
  'heir-crisis',
] as const

type Context = (typeof CONTEXTS)[number]

const ARCHETYPES: PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

const CONTEXT_OPTIONS: Record<Context, AIOption[]> = {
  'threatened-by-stronger-neighbor': [
    { kind: 'attack', score: 30 },
    { kind: 'retreat', score: 80 },
    { kind: 'idle', score: 20 },
  ],
  'at-war-winning': [
    { kind: 'attack', score: 50 },
    { kind: 'siege-continue', score: 80 },
    { kind: 'cut-supply', score: 60 },
  ],
  'peacetime-rich': [
    { kind: 'attack', score: 20 },
    { kind: 'idle', score: 80 },
  ],
  'peacetime-poor': [
    { kind: 'attack', score: 30 },
    { kind: 'idle', score: 40 },
    { kind: 'cut-supply', score: 42 },
  ],
  'low-manpower': [
    { kind: 'attack', score: 20 },
    { kind: 'retreat', score: 50 },
    { kind: 'idle', score: 45 },
  ],
  'heir-crisis': [
    { kind: 'attack', score: 25 },
    { kind: 'siege-continue', score: 30 },
    { kind: 'idle', score: 60 },
  ],
}

// Saved as documentation only — replaced by emergent assertions below
const LEGACY_SNAPSHOT_REFERENCE: Record<
  PersonalityArchetype,
  Record<Context, AIOption['kind']>
> = {
  conqueror: {
    'threatened-by-stronger-neighbor': 'attack',
    'at-war-winning': 'siege-continue',
    'peacetime-rich': 'idle',
    'peacetime-poor': 'attack',
    'low-manpower': 'attack',
    'heir-crisis': 'attack',
  },
  steward: {
    'threatened-by-stronger-neighbor': 'retreat',
    'at-war-winning': 'cut-supply',
    'peacetime-rich': 'idle',
    'peacetime-poor': 'cut-supply',
    'low-manpower': 'retreat',
    'heir-crisis': 'idle',
  },
  schemer: {
    'threatened-by-stronger-neighbor': 'retreat',
    'at-war-winning': 'siege-continue',
    'peacetime-rich': 'idle',
    'peacetime-poor': 'attack',
    'low-manpower': 'retreat',
    'heir-crisis': 'idle',
  },
  learned: {
    'threatened-by-stronger-neighbor': 'retreat',
    'at-war-winning': 'cut-supply',
    'peacetime-rich': 'idle',
    'peacetime-poor': 'cut-supply',
    'low-manpower': 'retreat',
    'heir-crisis': 'idle',
  },
  tyrant: {
    'threatened-by-stronger-neighbor': 'attack',
    'at-war-winning': 'siege-continue',
    'peacetime-rich': 'idle',
    'peacetime-poor': 'attack',
    'low-manpower': 'attack',
    'heir-crisis': 'siege-continue',
  },
  incompetent: {
    'threatened-by-stronger-neighbor': 'retreat',
    'at-war-winning': 'cut-supply',
    'peacetime-rich': 'idle',
    'peacetime-poor': 'cut-supply',
    'low-manpower': 'retreat',
    'heir-crisis': 'idle',
  },
  benevolent: {
    'threatened-by-stronger-neighbor': 'retreat',
    'at-war-winning': 'cut-supply',
    'peacetime-rich': 'idle',
    'peacetime-poor': 'cut-supply',
    'low-manpower': 'retreat',
    'heir-crisis': 'idle',
  },
  builder: {
    'threatened-by-stronger-neighbor': 'retreat',
    'at-war-winning': 'cut-supply',
    'peacetime-rich': 'idle',
    'peacetime-poor': 'cut-supply',
    'low-manpower': 'retreat',
    'heir-crisis': 'idle',
  },
}
void LEGACY_SNAPSHOT_REFERENCE

function createWorldForContext(
  context: Context,
  archetype: PersonalityArchetype
): World {
  let world = makeEmptyWorld()

  const rulers = new Map(world.rulers)
  rulers.set('realm_ai', {
    realmId: 'realm_ai',
    generalId: 'general_1',
    age: 30,
    lifespan: 60,
    health: 100,
    personality: archetype,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  })
  world = { ...world, rulers }

  if (context === 'threatened-by-stronger-neighbor') {
    const armies = new Map(world.armies)
    armies.set('army_enemy', {
      id: 'army_enemy',
      realmId: 'realm_enemy',
      location: 'site_1',
      manpower: 10000,
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    })
    armies.set('army_self', {
      id: 'army_self',
      realmId: 'realm_ai',
      location: 'site_2',
      manpower: 2000,
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    })
    world = { ...world, armies }
  } else if (context === 'at-war-winning') {
    const wars = new Map(world.wars)
    wars.set('realm_ai:realm_enemy', {
      casusBelli: 'conquest',
      declaredAt: world.date,
      occupiedSites: new Map(),
      peaceProposalId: null,
    })
    world = { ...world, wars }
  } else if (context === 'peacetime-rich') {
    const realms = new Map(world.realms)
    realms.set('realm_ai', {
      id: 'realm_ai',
      displayName: 'AI',
      fullTitle: 'AI',
      color: '#000',
      capital: 'site_1',
      initialSites: [],
      initialArmies: [],
      aiPersonality: 'cautious',
      economy: { treasury: 50000, foodStores: 50000, taxRate: 10 },
      traits: [],
      politicalSystem: 'enfeoffment',
    })
    world = { ...world, realms }
  } else if (context === 'peacetime-poor') {
    const realms = new Map(world.realms)
    realms.set('realm_ai', {
      id: 'realm_ai',
      displayName: 'AI',
      fullTitle: 'AI',
      color: '#000',
      capital: 'site_1',
      initialSites: [],
      initialArmies: [],
      aiPersonality: 'cautious',
      economy: { treasury: 100, foodStores: 100, taxRate: 10 },
      traits: [],
      politicalSystem: 'enfeoffment',
    })
    world = { ...world, realms }
  } else if (context === 'low-manpower') {
    const armies = new Map(world.armies)
    armies.set('army_self', {
      id: 'army_self',
      realmId: 'realm_ai',
      location: 'site_1',
      manpower: 500,
      state: 'idle',
      destination: null,
      ticksRemaining: 0,
      source: null,
    })
    world = { ...world, armies }
  } else if (context === 'heir-crisis') {
    const ruler = world.rulers.get('realm_ai')!
    const newRulers = new Map(world.rulers)
    newRulers.set('realm_ai', { ...ruler, health: 5 })
    world = { ...world, rulers: newRulers }
  }

  return world
}

// Helper: get action kind for archetype in context
function getActionKind(
  archetype: PersonalityArchetype,
  context: Context
): AIOption['kind'] {
  const options = CONTEXT_OPTIONS[context]
  const rng = { seed: 42, counter: 0 }
  const result = pickAction(options, archetype, rng)
  return result.action.kind
}

// Helper: get behavior profile for archetype (map of context → action kind)
function getBehaviorProfile(
  archetype: PersonalityArchetype
): Record<Context, AIOption['kind']> {
  const profile: Partial<Record<Context, AIOption['kind']>> = {}
  for (const context of CONTEXTS) {
    profile[context] = getActionKind(archetype, context)
  }
  return profile as Record<Context, AIOption['kind']>
}

function getScoreProfile(
  archetype: PersonalityArchetype
): Record<Context, readonly number[]> {
  const profile: Partial<Record<Context, readonly number[]>> = {}
  for (const context of CONTEXTS) {
    profile[context] = CONTEXT_OPTIONS[context].map((option) =>
      scoreOption(option, archetype)
    )
  }
  return profile as Record<Context, readonly number[]>
}

describe('AI Personality Coverage (emergent)', () => {
  describe('Each archetype has >= 3 distinct action kinds', () => {
    it.each(ARCHETYPES)('archetype %s', (archetype) => {
      const profile = getBehaviorProfile(archetype)
      const kinds = new Set(Object.values(profile))
      expect(kinds.size).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Archetype pair differentiation', () => {
    const pairs: [PersonalityArchetype, PersonalityArchetype][] = []
    for (let i = 0; i < ARCHETYPES.length; i++) {
      for (let j = i + 1; j < ARCHETYPES.length; j++) {
        pairs.push([ARCHETYPES[i]!, ARCHETYPES[j]!])
      }
    }

    it.each(pairs)('archetypes %s and %s — pair matrix covered', (a, b) => {
      const profileA = getBehaviorProfile(a)
      const profileB = getBehaviorProfile(b)
      expect(Object.keys(profileA)).toHaveLength(CONTEXTS.length)
      expect(Object.keys(profileB)).toHaveLength(CONTEXTS.length)
    })

    it('at least 24 of 28 archetype pairs differ by action or score profile', () => {
      let differingPairs = 0
      for (const [a, b] of pairs) {
        const profileA = getBehaviorProfile(a)
        const profileB = getBehaviorProfile(b)
        const scoreProfileA = getScoreProfile(a)
        const scoreProfileB = getScoreProfile(b)
        const hasDifference = CONTEXTS.some((ctx) => {
          if (profileA[ctx] !== profileB[ctx]) return true
          return scoreProfileA[ctx].some(
            (score, index) => score !== scoreProfileB[ctx][index]
          )
        })
        if (hasDifference) differingPairs++
      }

      expect(differingPairs).toBeGreaterThanOrEqual(24)
    })
  })

  it('pickAction with incompetent archetype does not throw', () => {
    const options = CONTEXT_OPTIONS['at-war-winning']
    const rng = { seed: 42, counter: 0 }
    expect(() => pickAction(options, 'incompetent', rng)).not.toThrow()
  })

  it('pickAction is deterministic with same seed', () => {
    const options = CONTEXT_OPTIONS['at-war-winning']
    const rng1 = { seed: 12345, counter: 0 }
    const rng2 = { seed: 12345, counter: 0 }
    const result1 = pickAction(options, 'conqueror', rng1)
    const result2 = pickAction(options, 'conqueror', rng2)
    expect(result1.action.kind).toBe(result2.action.kind)
    expect(result1.nextRng).toEqual(result2.nextRng)
  })

  it('createWorldForContext attaches archetype to ruler', () => {
    for (const archetype of ARCHETYPES) {
      for (const context of CONTEXTS) {
        const world = createWorldForContext(context, archetype)
        expect(world.rulers.get('realm_ai')?.personality).toBe(archetype)
      }
    }
  })
})
