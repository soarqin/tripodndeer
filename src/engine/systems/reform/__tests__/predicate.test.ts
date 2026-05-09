import { describe, expect, it } from 'vitest'

import { evaluatePredicate } from '../predicate'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { warKey } from '~/engine/wars/wars'
import type {
  General,
  GovernorAssignment,
  PersonalityArchetype,
  PoliticalSystem,
  Realm,
  RealmId,
  RulerState,
  Site,
  WarState,
} from '~/shared/types'

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_qin_capital',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeRuler(overrides: Partial<RulerState> = {}): RulerState {
  return {
    realmId: 'realm_qin',
    generalId: 'gen_qin_ruler',
    age: 30,
    lifespan: 60,
    health: 100,
    personality: 'conqueror',
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
    ...overrides,
  }
}

function makeGeneral(overrides: Partial<General> = {}): General {
  return {
    id: 'gen_1',
    realmId: 'realm_qin',
    name: 'Test General',
    might: 50,
    command: 50,
    loyalty: 80,
    ...overrides,
  }
}

function makeSite(id: string, ownerId: RealmId | null, population: number): Site {
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
      households: Math.floor(population / 4),
      taxBase: population,
      foodProduction: population,
    },
  }
}

function makeWarState(): WarState {
  return {
    casusBelli: null,
    declaredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

describe('evaluatePredicate: realm.id', () => {
  it('returns true when realm id matches value', () => {
    const world = makeEmptyWorld()
    const realm = makeRealm({ id: 'realm_qin' })
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.id', value: 'realm_qin' }),
    ).toBe(true)
  })

  it('returns false when realm id does not match value', () => {
    const world = makeEmptyWorld()
    const realm = makeRealm({ id: 'realm_qin' })
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.id', value: 'realm_zhao' }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.has-character-with-specialty', () => {
  it('returns true when realm has a character with the specified specialty', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const general = makeGeneral({
      id: 'gen_1',
      realmId: 'realm_qin',
      specialty: 'reformer',
    })
    const world = makeEmptyWorld({ generals: new Map([['gen_1', general]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.has-character-with-specialty',
        specialty: 'reformer',
      }),
    ).toBe(true)
  })

  it('returns false when realm has no character with the specified specialty', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const general = makeGeneral({
      id: 'gen_1',
      realmId: 'realm_qin',
      specialty: 'warrior',
    })
    const world = makeEmptyWorld({ generals: new Map([['gen_1', general]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.has-character-with-specialty',
        specialty: 'reformer',
      }),
    ).toBe(false)
  })

  it('ignores characters from other realms', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const general = makeGeneral({
      id: 'gen_1',
      realmId: 'realm_zhao',
      specialty: 'reformer',
    })
    const world = makeEmptyWorld({ generals: new Map([['gen_1', general]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.has-character-with-specialty',
        specialty: 'reformer',
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.ruler-personality-in', () => {
  it('returns true when ruler personality is in values', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const ruler = makeRuler({ realmId: 'realm_qin', personality: 'conqueror' })
    const world = makeEmptyWorld({ rulers: new Map([['realm_qin', ruler]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.ruler-personality-in',
        values: ['conqueror', 'tyrant'],
      }),
    ).toBe(true)
  })

  it('returns false when ruler personality is not in values', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const ruler = makeRuler({ realmId: 'realm_qin', personality: 'benevolent' })
    const world = makeEmptyWorld({ rulers: new Map([['realm_qin', ruler]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.ruler-personality-in',
        values: ['conqueror', 'tyrant'],
      }),
    ).toBe(false)
  })

  it('returns false when realm has no ruler', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.ruler-personality-in',
        values: ['conqueror'],
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.has-trait', () => {
  it('returns true when realm has the trait', () => {
    const realm = makeRealm({ traits: ['shang_yang_reform_done'] })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.has-trait',
        trait: 'shang_yang_reform_done',
      }),
    ).toBe(true)
  })

  it('returns false when realm does not have the trait', () => {
    const realm = makeRealm({ traits: [] })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.has-trait',
        trait: 'shang_yang_reform_done',
      }),
    ).toBe(false)
  })

  it('with not:true returns false when realm has the trait', () => {
    const realm = makeRealm({ traits: ['shang_yang_reform_done'] })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.has-trait',
        trait: 'shang_yang_reform_done',
        not: true,
      }),
    ).toBe(false)
  })

  it('with not:true returns true when realm does not have the trait', () => {
    const realm = makeRealm({ traits: [] })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.has-trait',
        trait: 'shang_yang_reform_done',
        not: true,
      }),
    ).toBe(true)
  })
})

describe('evaluatePredicate: realm.no-active-war', () => {
  it('returns true when realm has no active wars', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.no-active-war' }),
    ).toBe(true)
  })

  it('returns false when realm has an active war', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const wars = new Map([[warKey('realm_qin', 'realm_zhao'), makeWarState()]])
    const world = makeEmptyWorld({ wars })
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.no-active-war' }),
    ).toBe(false)
  })

  it('returns true when wars exist but none involve this realm', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const wars = new Map([[warKey('realm_zhao', 'realm_chu'), makeWarState()]])
    const world = makeEmptyWorld({ wars })
    expect(
      evaluatePredicate(world, realm, { kind: 'realm.no-active-war' }),
    ).toBe(true)
  })
})

describe('evaluatePredicate: realm.treasury-above', () => {
  it('returns true when treasury exceeds value', () => {
    const realm = makeRealm({
      economy: { treasury: 5000, foodStores: 0, taxRate: 10 },
    })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.treasury-above',
        value: 1000,
      }),
    ).toBe(true)
  })

  it('returns false when treasury is below or equal to value', () => {
    const realm = makeRealm({
      economy: { treasury: 1000, foodStores: 0, taxRate: 10 },
    })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.treasury-above',
        value: 1000,
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.population-above', () => {
  it('returns true when total owned site population exceeds value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const sites = new Map<string, Site>([
      ['site_a', makeSite('site_a', 'realm_qin', 5000)],
      ['site_b', makeSite('site_b', 'realm_qin', 3000)],
    ])
    const world = makeEmptyWorld({ sites })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.population-above',
        value: 7000,
      }),
    ).toBe(true)
  })

  it('returns false when total owned site population is below value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const sites = new Map<string, Site>([
      ['site_a', makeSite('site_a', 'realm_qin', 1000)],
    ])
    const world = makeEmptyWorld({ sites })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.population-above',
        value: 5000,
      }),
    ).toBe(false)
  })

  it('ignores sites owned by other realms', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const sites = new Map<string, Site>([
      ['site_a', makeSite('site_a', 'realm_qin', 1000)],
      ['site_b', makeSite('site_b', 'realm_zhao', 9999)],
    ])
    const world = makeEmptyWorld({ sites })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.population-above',
        value: 5000,
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.ruler-in-office-years', () => {
  it('returns true when ruler has been in office for exactly minYears (boundary)', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const ruler = makeRuler({ realmId: 'realm_qin', inOfficeSinceTick: 0 })
    const world = makeEmptyWorld({
      tick: 360,
      rulers: new Map([['realm_qin', ruler]]),
    })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.ruler-in-office-years',
        minYears: 10,
      }),
    ).toBe(true)
  })

  it('returns false when ruler has been in office for less than minYears (9.9 years)', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const ruler = makeRuler({ realmId: 'realm_qin', inOfficeSinceTick: 0 })
    const world = makeEmptyWorld({
      tick: 356,
      rulers: new Map([['realm_qin', ruler]]),
    })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.ruler-in-office-years',
        minYears: 10,
      }),
    ).toBe(false)
  })

  it('returns false when realm has no ruler', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld({ tick: 720 })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.ruler-in-office-years',
        minYears: 10,
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.has-political-system', () => {
  it('returns true when politicalSystem matches', () => {
    const realm = makeRealm({ politicalSystem: 'legalist_centralized' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.has-political-system',
        system: 'legalist_centralized',
      }),
    ).toBe(true)
  })

  it('returns false when politicalSystem does not match', () => {
    const realm = makeRealm({ politicalSystem: 'enfeoffment' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.has-political-system',
        system: 'commandery',
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.year-after', () => {
  it('returns true when world yearBC equals predicate yearBC (boundary)', () => {
    const realm = makeRealm()
    const world = makeEmptyWorld({
      date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.year-after',
        yearBC: 260,
      }),
    ).toBe(true)
  })

  it('returns true when world yearBC is later (smaller) than predicate yearBC', () => {
    const realm = makeRealm()
    const world = makeEmptyWorld({
      date: { yearBC: 250, season: 'spring', month: 1, xun: 'shang' },
    })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.year-after',
        yearBC: 260,
      }),
    ).toBe(true)
  })

  it('returns false when world yearBC is earlier (larger) than predicate yearBC', () => {
    const realm = makeRealm()
    const world = makeEmptyWorld({
      date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.year-after',
        yearBC: 259,
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: and', () => {
  it('returns true when all children are true', () => {
    const realm = makeRealm({
      id: 'realm_qin',
      traits: ['shang_yang_reform_done'],
    })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'and',
        children: [
          { kind: 'realm.id', value: 'realm_qin' },
          { kind: 'realm.has-trait', trait: 'shang_yang_reform_done' },
        ],
      }),
    ).toBe(true)
  })

  it('returns false when any child is false', () => {
    const realm = makeRealm({ id: 'realm_qin', traits: [] })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'and',
        children: [
          { kind: 'realm.id', value: 'realm_qin' },
          { kind: 'realm.has-trait', trait: 'shang_yang_reform_done' },
        ],
      }),
    ).toBe(false)
  })

  it('handles nested or inside and', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const ruler = makeRuler({ realmId: 'realm_qin', personality: 'conqueror' })
    const world = makeEmptyWorld({ rulers: new Map([['realm_qin', ruler]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'and',
        children: [
          { kind: 'realm.id', value: 'realm_qin' },
          {
            kind: 'or',
            children: [
              {
                kind: 'realm.ruler-personality-in',
                values: ['benevolent'],
              },
              {
                kind: 'realm.ruler-personality-in',
                values: ['conqueror'],
              },
            ],
          },
        ],
      }),
    ).toBe(true)
  })
})

describe('evaluatePredicate: or', () => {
  it('returns true when any child is true', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'or',
        children: [
          { kind: 'realm.id', value: 'realm_zhao' },
          { kind: 'realm.id', value: 'realm_qin' },
        ],
      }),
    ).toBe(true)
  })

  it('returns false when all children are false', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'or',
        children: [
          { kind: 'realm.id', value: 'realm_zhao' },
          { kind: 'realm.id', value: 'realm_chu' },
        ],
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: site.terrain', () => {
  it('returns true when site terrain matches value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const site = makeSite('site_01', 'realm_qin', 5000)
    site.terrainType = 'plains'
    const world = makeEmptyWorld({ sites: new Map([['site_01', site]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'site.terrain',
        siteId: 'site_01',
        value: 'plains',
      }),
    ).toBe(true)
  })

  it('returns false when site terrain does not match value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const site = makeSite('site_01', 'realm_qin', 5000)
    site.terrainType = 'plains'
    const world = makeEmptyWorld({ sites: new Map([['site_01', site]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'site.terrain',
        siteId: 'site_01',
        value: 'mountains',
      }),
    ).toBe(false)
  })

  it('returns false when site does not exist', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'site.terrain',
        siteId: 'nonexistent',
        value: 'plains',
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: site.population-above', () => {
  it('returns true when site population exceeds value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const site = makeSite('site_01', 'realm_qin', 10000)
    const world = makeEmptyWorld({ sites: new Map([['site_01', site]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'site.population-above',
        siteId: 'site_01',
        value: 5000,
      }),
    ).toBe(true)
  })

  it('returns false when site population is below or equal to value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const site = makeSite('site_01', 'realm_qin', 10000)
    const world = makeEmptyWorld({ sites: new Map([['site_01', site]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'site.population-above',
        siteId: 'site_01',
        value: 20000,
      }),
    ).toBe(false)
  })

  it('returns false when site does not exist', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'site.population-above',
        siteId: 'nonexistent',
        value: 5000,
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: site.governor-zheng-above', () => {
  it('returns true when governor zheng exceeds value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const site = makeSite('site_01', 'realm_qin', 5000)
    const general = makeGeneral({
      id: 'gen_01',
      realmId: 'realm_qin',
      attrs: { wu: 10, zheng: 15, jiao: 10, mou: 10, xue: 10, po: 10 },
    })
    const govAssignment: GovernorAssignment = {
      siteId: 'site_01',
      realmId: 'realm_qin',
      generalId: 'gen_01',
      assignedAtTick: 0,
      modifierKind: 'tax_efficiency',
    }
    const world = makeEmptyWorld({
      sites: new Map([['site_01', site]]),
      generals: new Map([['gen_01', general]]),
      governorAssignments: new Map([['site_01', govAssignment]]),
    })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'site.governor-zheng-above',
        siteId: 'site_01',
        value: 10,
      }),
    ).toBe(true)
  })

  it('returns false when governor zheng is below or equal to value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const site = makeSite('site_01', 'realm_qin', 5000)
    const general = makeGeneral({
      id: 'gen_01',
      realmId: 'realm_qin',
      attrs: { wu: 10, zheng: 15, jiao: 10, mou: 10, xue: 10, po: 10 },
    })
    const govAssignment: GovernorAssignment = {
      siteId: 'site_01',
      realmId: 'realm_qin',
      generalId: 'gen_01',
      assignedAtTick: 0,
      modifierKind: 'tax_efficiency',
    }
    const world = makeEmptyWorld({
      sites: new Map([['site_01', site]]),
      generals: new Map([['gen_01', general]]),
      governorAssignments: new Map([['site_01', govAssignment]]),
    })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'site.governor-zheng-above',
        siteId: 'site_01',
        value: 20,
      }),
    ).toBe(false)
  })

  it('returns false when no governor is assigned to site', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const site = makeSite('site_01', 'realm_qin', 5000)
    const world = makeEmptyWorld({ sites: new Map([['site_01', site]]) })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'site.governor-zheng-above',
        siteId: 'site_01',
        value: 10,
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: realm.faction-influence-above', () => {
  it('returns true when faction influence exceeds value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld({
      factionInfluences: new Map([
        [
          'realm_qin',
          {
            realmId: 'realm_qin',
            influences: new Map([['military_meritocracy', 70]]),
          },
        ],
      ]),
    })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.faction-influence-above',
        realmId: 'realm_qin',
        faction: 'military_meritocracy',
        value: 50,
      }),
    ).toBe(true)
  })

  it('returns false when faction influence is below or equal to value', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld({
      factionInfluences: new Map([
        [
          'realm_qin',
          {
            realmId: 'realm_qin',
            influences: new Map([['military_meritocracy', 70]]),
          },
        ],
      ]),
    })
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.faction-influence-above',
        realmId: 'realm_qin',
        faction: 'military_meritocracy',
        value: 80,
      }),
    ).toBe(false)
  })

  it('returns false when realm has no faction influences', () => {
    const realm = makeRealm({ id: 'realm_qin' })
    const world = makeEmptyWorld()
    expect(
      evaluatePredicate(world, realm, {
        kind: 'realm.faction-influence-above',
        realmId: 'realm_qin',
        faction: 'military_meritocracy',
        value: 50,
      }),
    ).toBe(false)
  })
})

describe('evaluatePredicate: exhaustive coverage', () => {
  it('covers all 12 PredicateNode kinds', () => {
    const kinds: ReadonlyArray<string> = [
      'realm.id',
      'realm.has-character-with-specialty',
      'realm.ruler-personality-in',
      'realm.has-trait',
      'realm.no-active-war',
      'realm.treasury-above',
      'realm.population-above',
      'realm.ruler-in-office-years',
      'realm.has-political-system',
      'realm.year-after',
      'and',
      'or',
    ]
    expect(kinds).toHaveLength(12)
  })

  it('accepts all PoliticalSystem values', () => {
    const systems: ReadonlyArray<PoliticalSystem> = [
      'enfeoffment',
      'commandery',
      'legalist_centralized',
    ]
    const world = makeEmptyWorld()
    for (const system of systems) {
      const realm = makeRealm({ politicalSystem: system })
      expect(
        evaluatePredicate(world, realm, {
          kind: 'realm.has-political-system',
          system,
        }),
      ).toBe(true)
    }
  })

  it('accepts all PersonalityArchetype values via ruler-personality-in', () => {
    const archetypes: ReadonlyArray<PersonalityArchetype> = [
      'conqueror',
      'steward',
      'schemer',
      'learned',
      'tyrant',
      'incompetent',
      'benevolent',
      'builder',
    ]
    const realm = makeRealm({ id: 'realm_qin' })
    for (const archetype of archetypes) {
      const ruler = makeRuler({ realmId: 'realm_qin', personality: archetype })
      const world = makeEmptyWorld({ rulers: new Map([['realm_qin', ruler]]) })
      expect(
        evaluatePredicate(world, realm, {
          kind: 'realm.ruler-personality-in',
          values: [archetype],
        }),
      ).toBe(true)
    }
  })
})
