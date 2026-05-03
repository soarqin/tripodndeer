import { describe, expect, it } from 'vitest'

import {
  CounterIntelStateSchema,
  CoverageKeySchema,
  EspionageActionKindSchema,
  M1DataSchemaV7,
  SpyMissionSchema,
  SpyMissionStatusSchema,
  WorldSchema,
} from '~/shared/schemas'
import { isValidEffectType } from '~/engine/systems/events/event-chain-engine'

import { makeEmptyWorld } from './fixtures'

describe('M7 EspionageActionKindSchema', () => {
  it('accepts the four canonical action kinds', () => {
    for (const kind of ['reconnaissance', 'rumor', 'discord', 'counter_intel'] as const) {
      expect(EspionageActionKindSchema.parse(kind)).toBe(kind)
    }
  })

  it('rejects forbidden action kinds excluded by G6 decision', () => {
    const forbidden = ['assassinate', 'defect', 'steal_tactic', 'steal_culture'] as const
    for (const kind of forbidden) {
      expect(EspionageActionKindSchema.safeParse(kind).success).toBe(false)
    }
  })
})

describe('M7 SpyMissionSchema', () => {
  const validMission = {
    id: 'mission_1',
    spyGeneralId: 'general_su_dai',
    spyRealmId: 'realm_yan',
    targetRealmId: 'realm_qi',
    action: 'reconnaissance' as const,
    startTick: 100,
    resolveTick: 124,
    status: 'in_progress' as const,
    targetGeneralId: null,
  }

  it('accepts a fully-populated valid mission', () => {
    expect(SpyMissionSchema.parse(validMission).id).toBe('mission_1')
  })

  it('accepts a mission with targetGeneralId set (discord action)', () => {
    const discord = { ...validMission, action: 'discord' as const, targetGeneralId: 'general_lian_po' }
    expect(SpyMissionSchema.parse(discord).targetGeneralId).toBe('general_lian_po')
  })

  it('rejects a mission with an invalid action kind', () => {
    const bad = { ...validMission, action: 'assassinate' }
    expect(SpyMissionSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a mission with an unknown status', () => {
    const bad = { ...validMission, status: 'pending' }
    expect(SpyMissionSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a mission with a negative startTick', () => {
    const bad = { ...validMission, startTick: -1 }
    expect(SpyMissionSchema.safeParse(bad).success).toBe(false)
  })

  it('SpyMissionStatusSchema covers the five lifecycle statuses', () => {
    for (const status of ['in_progress', 'success', 'failed', 'exposed', 'cancelled'] as const) {
      expect(SpyMissionStatusSchema.parse(status)).toBe(status)
    }
  })
})

describe('M7 CoverageKeySchema (directional, NOT lex-sorted)', () => {
  it('accepts a key with realm IDs containing internal underscores', () => {
    expect(CoverageKeySchema.parse('realm_qin__realm_chu')).toBe('realm_qin__realm_chu')
    expect(CoverageKeySchema.parse('realm_chu__realm_qin')).toBe('realm_chu__realm_qin')
  })

  it('accepts a key with simple non-underscored IDs', () => {
    expect(CoverageKeySchema.parse('qin__chu')).toBe('qin__chu')
  })

  it('rejects a key with only a single underscore separator', () => {
    expect(CoverageKeySchema.safeParse('realm_qin_realm_chu').success).toBe(false)
  })

  it('rejects a key with no separator at all', () => {
    expect(CoverageKeySchema.safeParse('realm_qinrealmchu').success).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(CoverageKeySchema.safeParse('').success).toBe(false)
  })
})

describe('M7 CounterIntelStateSchema', () => {
  const validState = {
    realmId: 'realm_qin',
    detectionLevel: 5,
    lastUpdatedTick: 200,
  }

  it('accepts a valid counter-intelligence state', () => {
    expect(CounterIntelStateSchema.parse(validState).detectionLevel).toBe(5)
  })

  it('accepts boundary values 0 and 10 for detectionLevel', () => {
    expect(CounterIntelStateSchema.parse({ ...validState, detectionLevel: 0 }).detectionLevel).toBe(0)
    expect(CounterIntelStateSchema.parse({ ...validState, detectionLevel: 10 }).detectionLevel).toBe(10)
  })

  it('rejects detectionLevel above the cap of 10', () => {
    expect(CounterIntelStateSchema.safeParse({ ...validState, detectionLevel: 11 }).success).toBe(false)
  })

  it('rejects negative detectionLevel', () => {
    expect(CounterIntelStateSchema.safeParse({ ...validState, detectionLevel: -1 }).success).toBe(false)
  })

  it('rejects fractional detectionLevel (must be integer)', () => {
    expect(CounterIntelStateSchema.safeParse({ ...validState, detectionLevel: 5.5 }).success).toBe(false)
  })
})

describe('M7 EffectSchema NOT extended (G6 decision: reuse existing effects)', () => {
  it('rejects forbidden new effect types not in EFFECT_TYPES whitelist', () => {
    const forbidden = [
      'character.assassinate',
      'character.defect',
      'realm.tactic.steal',
      'realm.culture.steal',
      'realm.intelligence.delta',
    ]
    for (const type of forbidden) {
      expect(isValidEffectType(type)).toBe(false)
    }
  })

  it('still includes existing effects that M7 reuses (character.loyalty, realm.relation.delta, realm.faction.delta)', () => {
    expect(isValidEffectType('character.loyalty')).toBe(true)
    expect(isValidEffectType('realm.relation.delta')).toBe(true)
    expect(isValidEffectType('realm.faction.delta')).toBe(true)
  })
})

describe('M7 M1DataSchemaV7', () => {
  const baseV7Data = {
    schema_version: 7 as const,
    edges: {},
    sites: [],
    realms: [],
    initialOwnership: {},
    initialArmies: [],
    initialWars: [],
  }

  it('accepts a v7 scenario with schema_version: 7', () => {
    const parsed = M1DataSchemaV7.parse(baseV7Data)
    expect(parsed.schema_version).toBe(7)
  })

  it('rejects a scenario with schema_version: 6 (must be exactly 7)', () => {
    const bad = { ...baseV7Data, schema_version: 6 }
    expect(M1DataSchemaV7.safeParse(bad).success).toBe(false)
  })

  it('inherits academies field from V6', () => {
    const withAcademies = {
      ...baseV7Data,
      academies: [
        {
          id: 'academy_jixia',
          hostRealmId: 'realm_qi',
          hostSiteId: 'site_qi',
          primaryIdeology: 'ru' as const,
          secondaryIdeology: null,
          founded: 318,
          level: 1 as const,
          status: 'active' as const,
        },
      ],
    }
    const parsed = M1DataSchemaV7.parse(withAcademies)
    expect(parsed.academies).toHaveLength(1)
  })
})

describe('M7 WorldSchema includes the 3 espionage Maps', () => {
  it('accepts a world with empty M7 Maps', () => {
    const world = makeEmptyWorld()
    expect(WorldSchema.safeParse(world).success).toBe(true)
  })

  it('rejects a world whose intelligenceCoverage field is a plain object instead of a Map', () => {
    const world = makeEmptyWorld()
    const bad = {
      ...world,
      intelligenceCoverage: {} as unknown as ReadonlyMap<string, number>,
    }
    expect(WorldSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a world whose spyMissions field is missing', () => {
    const world = makeEmptyWorld()
    const { spyMissions: _drop, ...withoutSpyMissions } = world
    expect(WorldSchema.safeParse(withoutSpyMissions).success).toBe(false)
  })

  it('rejects a world whose counterIntelStates field is missing', () => {
    const world = makeEmptyWorld()
    const { counterIntelStates: _drop, ...withoutCounterIntel } = world
    expect(WorldSchema.safeParse(withoutCounterIntel).success).toBe(false)
  })
})
