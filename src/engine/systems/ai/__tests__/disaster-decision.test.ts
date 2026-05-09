import { describe, expect, it } from 'vitest'
import type {
  DisasterDefinition,
  PersonalityArchetype,
  Realm,
  RulerState,
  World,
} from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { selectAIDisasterChoice } from '../disaster-decision'

const ALL_ARCHETYPES: readonly PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

const VALID_CHOICE_IDS = new Set(['open_granary', 'reduce_tax', 'forced_levy', 'ignore'])

const STANDARD_DEFINITION: DisasterDefinition = {
  id: 'disaster_test',
  displayName: 'Test',
  displayNameZh: '测试',
  trigger: { kind: 'and', children: [] },
  baseProbabilityBp: 1000,
  effects: [],
  playerChoices: [
    {
      id: 'open_granary',
      labelZh: '开仓赈灾',
      costType: 'foodStores',
      costAmount: 2000,
      effects: [],
      outcomeZh: '',
    },
    {
      id: 'reduce_tax',
      labelZh: '减免赋税',
      costType: 'treasury',
      costAmount: 500,
      effects: [],
      outcomeZh: '',
    },
    {
      id: 'forced_levy',
      labelZh: '强征民力',
      costType: 'none',
      costAmount: 0,
      effects: [],
      outcomeZh: '',
    },
    {
      id: 'ignore',
      labelZh: '置之不理',
      costType: 'none',
      costAmount: 0,
      effects: [],
      outcomeZh: '',
    },
  ],
  durationMonths: 1,
}

interface MakeRealmOpts {
  readonly treasury?: number
  readonly foodStores?: number
}

function makeRealm(id: string, opts: MakeRealmOpts = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: {
      treasury: opts.treasury ?? 10000,
      foodStores: opts.foodStores ?? 10000,
      taxRate: 0.1,
    },
    traits: [],
    politicalSystem: 'enfeoffment',
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

function makeWorldFor(personality: PersonalityArchetype, realm: Realm): World {
  const realms = new Map<string, Realm>([[realm.id, realm]])
  const rulers = new Map<string, RulerState>([[realm.id, makeRuler(realm.id, personality)]])
  return makeEmptyWorld({ realms, rulers, playerRealmId: 'realm_player' })
}

describe('selectAIDisasterChoice', () => {
  it('benevolent ruler with food prefers open_granary', () => {
    const realm = makeRealm('realm_ai', { foodStores: 5000, treasury: 1000 })
    const world = makeWorldFor('benevolent', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('open_granary')
  })

  it('steward ruler with treasury prefers reduce_tax', () => {
    const realm = makeRealm('realm_ai', { foodStores: 100, treasury: 5000 })
    const world = makeWorldFor('steward', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('reduce_tax')
  })

  it('tyrant ruler always picks forced_levy', () => {
    const realm = makeRealm('realm_ai', { foodStores: 100, treasury: 100 })
    const world = makeWorldFor('tyrant', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('forced_levy')
  })

  it('conqueror ruler always picks ignore', () => {
    const realm = makeRealm('realm_ai', { foodStores: 9999, treasury: 9999 })
    const world = makeWorldFor('conqueror', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('ignore')
  })

  it('incompetent ruler always picks ignore', () => {
    const realm = makeRealm('realm_ai', { foodStores: 9999, treasury: 9999 })
    const world = makeWorldFor('incompetent', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('ignore')
  })

  it('builder ruler with food prefers open_granary', () => {
    const realm = makeRealm('realm_ai', { foodStores: 5000, treasury: 100 })
    const world = makeWorldFor('builder', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('open_granary')
  })

  it('learned ruler with treasury prefers reduce_tax', () => {
    const realm = makeRealm('realm_ai', { foodStores: 100, treasury: 5000 })
    const world = makeWorldFor('learned', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('reduce_tax')
  })

  it('schemer ruler with treasury prefers reduce_tax', () => {
    const realm = makeRealm('realm_ai', { foodStores: 100, treasury: 5000 })
    const world = makeWorldFor('schemer', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('reduce_tax')
  })

  it('benevolent without food but with treasury falls back to reduce_tax', () => {
    const realm = makeRealm('realm_ai', { foodStores: 100, treasury: 5000 })
    const world = makeWorldFor('benevolent', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('reduce_tax')
  })

  it('benevolent without food and without treasury falls back to forced_levy', () => {
    const realm = makeRealm('realm_ai', { foodStores: 100, treasury: 100 })
    const world = makeWorldFor('benevolent', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('forced_levy')
  })

  it('steward without treasury falls back to forced_levy', () => {
    const realm = makeRealm('realm_ai', { foodStores: 100, treasury: 100 })
    const world = makeWorldFor('steward', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('forced_levy')
  })

  it('builder without food and without treasury falls back to forced_levy', () => {
    const realm = makeRealm('realm_ai', { foodStores: 100, treasury: 100 })
    const world = makeWorldFor('builder', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('forced_levy')
  })

  it('returns a valid choice ID for every archetype', () => {
    const realm = makeRealm('realm_ai', { foodStores: 5000, treasury: 5000 })
    for (const archetype of ALL_ARCHETYPES) {
      const world = makeWorldFor(archetype, realm)
      const choice = selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)
      expect(VALID_CHOICE_IDS.has(choice)).toBe(true)
    }
  })

  it('returns a valid choice ID for every archetype when broke', () => {
    const realm = makeRealm('realm_ai', { foodStores: 0, treasury: 0 })
    for (const archetype of ALL_ARCHETYPES) {
      const world = makeWorldFor(archetype, realm)
      const choice = selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)
      expect(VALID_CHOICE_IDS.has(choice)).toBe(true)
    }
  })

  it('falls back to ignore when no other choices exist', () => {
    const minimalDef: DisasterDefinition = {
      ...STANDARD_DEFINITION,
      playerChoices: [STANDARD_DEFINITION.playerChoices[3]!],
    }
    const realm = makeRealm('realm_ai', { foodStores: 0, treasury: 0 })
    const world = makeWorldFor('benevolent', realm)
    expect(selectAIDisasterChoice(world, realm, minimalDef)).toBe('ignore')
  })

  it('benevolent with exactly enough food picks open_granary', () => {
    const realm = makeRealm('realm_ai', { foodStores: 2000, treasury: 100 })
    const world = makeWorldFor('benevolent', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('open_granary')
  })

  it('steward with exactly enough treasury picks reduce_tax', () => {
    const realm = makeRealm('realm_ai', { foodStores: 100, treasury: 500 })
    const world = makeWorldFor('steward', realm)
    expect(selectAIDisasterChoice(world, realm, STANDARD_DEFINITION)).toBe('reduce_tax')
  })
})
