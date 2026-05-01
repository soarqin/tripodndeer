import { describe, expect, it } from 'vitest'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { pickAction, type AIOption } from '../utility-scorer'
import type { PersonalityArchetype, World } from '~/shared/types'

const CONTEXTS = [
  'threatened-by-stronger-neighbor',
  'at-war-winning',
  'peacetime-rich',
  'peacetime-poor',
  'low-manpower',
  'heir-crisis',
] as const

type Context = typeof CONTEXTS[number]

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

const EXPECTED_BEHAVIOR: Record<PersonalityArchetype, Record<Context, AIOption['kind']>> = {
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

function createWorldForContext(context: Context, archetype: PersonalityArchetype): World {
  const world = makeEmptyWorld()
  world.rulers.set('realm_ai', {
    id: 'ruler_1',
    realmId: 'realm_ai',
    name: 'AI Ruler',
    personality: archetype,
    birthYearBC: 300,
    health: 100,
    specialty: 'commander',
  })

  if (context === 'threatened-by-stronger-neighbor') {
    world.armies.set('army_enemy', {
      id: 'army_enemy',
      realmId: 'realm_enemy',
      location: 'site_1',
      manpower: 10000,
      state: 'idle',
      unitType: 'infantry',
      morale: 100,
      supply: 100,
    })
    world.armies.set('army_self', {
      id: 'army_self',
      realmId: 'realm_ai',
      location: 'site_2',
      manpower: 2000,
      state: 'idle',
      unitType: 'infantry',
      morale: 100,
      supply: 100,
    })
  } else if (context === 'at-war-winning') {
    world.wars.set('realm_ai:realm_enemy', {
      aggressorId: 'realm_ai',
      defenderId: 'realm_enemy',
      casusBelli: 'conquest',
      startDate: world.date,
      warScore: 80,
      battles: [],
    })
  } else if (context === 'peacetime-rich') {
    world.realms.set('realm_ai', {
      id: 'realm_ai',
      displayName: 'AI',
      fullTitle: 'AI',
      color: '#000',
      capital: 'site_1',
      initialSites: [],
      initialArmies: [],
      aiPersonality: 'cautious',
      economy: { treasury: 50000, foodStores: 50000, taxRate: 10 },
    })
  } else if (context === 'peacetime-poor') {
    world.realms.set('realm_ai', {
      id: 'realm_ai',
      displayName: 'AI',
      fullTitle: 'AI',
      color: '#000',
      capital: 'site_1',
      initialSites: [],
      initialArmies: [],
      aiPersonality: 'cautious',
      economy: { treasury: 100, foodStores: 100, taxRate: 10 },
    })
  } else if (context === 'low-manpower') {
    world.armies.set('army_self', {
      id: 'army_self',
      realmId: 'realm_ai',
      location: 'site_1',
      manpower: 500,
      state: 'idle',
      unitType: 'infantry',
      morale: 100,
      supply: 100,
    })
  } else if (context === 'heir-crisis') {
    const ruler = world.rulers.get('realm_ai')!
    world.rulers.set('realm_ai', { ...ruler, health: 5 })
  }

  return world
}

describe('AI Personality Coverage', () => {
  it('each archetype produces >= 3 distinct action kinds', () => {
    for (const archetype of ARCHETYPES) {
      const kinds = new Set<string>()
      for (const context of CONTEXTS) {
        kinds.add(EXPECTED_BEHAVIOR[archetype][context])
      }
      expect(kinds.size).toBeGreaterThanOrEqual(3)
    }
  })

  describe('Archetype x Context Matrix', () => {
    for (const archetype of ARCHETYPES) {
      describe(`Archetype: ${archetype}`, () => {
        for (const context of CONTEXTS) {
          it(`context: ${context}`, () => {
            const world = createWorldForContext(context, archetype)
            const options = CONTEXT_OPTIONS[context]
            const expected = EXPECTED_BEHAVIOR[archetype][context]

            const rng1 = { seed: 12345, counter: 0 }
            const result1 = pickAction(options, archetype, rng1)

            const rng2 = { seed: 12345, counter: 0 }
            const result2 = pickAction(options, archetype, rng2)

            expect(result1.action.kind).toBe(expected)
            expect(result2.action.kind).toBe(expected)
            expect(result1.nextRng).toEqual(result2.nextRng)
            
            expect(world.rulers.get('realm_ai')?.personality).toBe(archetype)
          })
        }
      })
    }
  })
})
