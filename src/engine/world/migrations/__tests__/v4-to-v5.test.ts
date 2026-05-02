import scenarioV1 from '@/content/m1/scenario.json'
import { describe, expect, it } from 'vitest'
import { migrateScenarioV3ToV4 } from '../v3-to-v4'
import { migrateScenarioV4ToV5 } from '../v4-to-v5'
import m5SaveV3 from './fixtures/m5-save-v3.json'

describe('migrateScenarioV4ToV5 — schema_version', () => {
  it('sets schema_version to 5', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const v5 = migrateScenarioV4ToV5(v4)
    expect(v5.schema_version).toBe(5)
  })
})

describe('migrateScenarioV4ToV5 — new arrays', () => {
  it('initializes disasterStates as empty array', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const v5 = migrateScenarioV4ToV5(v4)
    expect(v5.disasterStates).toEqual([])
  })

  it('initializes tradeRoutes as empty array', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const v5 = migrateScenarioV4ToV5(v4)
    expect(v5.tradeRoutes).toEqual([])
  })

  it('initializes factionInfluences as empty array', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const v5 = migrateScenarioV4ToV5(v4)
    expect(v5.factionInfluences).toEqual([])
  })
})

describe('migrateScenarioV4ToV5 — preserves v4 fields', () => {
  it('preserves realms with traits and politicalSystem', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const v5 = migrateScenarioV4ToV5(v4)
    const realm = v5.realms.find(r => r.id === 'realm_with_traits')!

    expect(realm.traits).toEqual(['legalist', 'qin_legacy'])
    expect(realm.politicalSystem).toBe('enfeoffment')
  })

  it('preserves rulers with inOfficeSinceTick', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const v5 = migrateScenarioV4ToV5(v4)

    expect(v5.rulers).toHaveLength(1)
    expect(v5.rulers[0]!.inOfficeSinceTick).toBe(0)
  })

  it('preserves reformStates as empty array', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const v5 = migrateScenarioV4ToV5(v4)
    expect(v5.reformStates).toEqual([])
  })

  it('preserves generals', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const v5 = migrateScenarioV4ToV5(v4)
    expect(v5.generals).toHaveLength(1)
    expect(v5.generals[0]!.id).toBe('gen_ruler')
  })
})

describe('migrateScenarioV4ToV5 — chain', () => {
  it('chains v3→v4→v5 when input is v3', () => {
    const v5 = migrateScenarioV4ToV5(m5SaveV3)

    expect(v5.schema_version).toBe(5)
    expect(v5.disasterStates).toEqual([])
    expect(v5.tradeRoutes).toEqual([])
    expect(v5.factionInfluences).toEqual([])
    expect(v5.reformStates).toEqual([])
  })

  it('chains v1→v2→v3→v4→v5 when raw data has no schema_version', () => {
    const v1Like = { ...scenarioV1 } as Record<string, unknown>
    delete v1Like.schema_version
    v1Like.realms = (scenarioV1.realms as Array<Record<string, unknown>>).map(r => {
      const { traits: _t, politicalSystem: _p, ...rest } = r
      return rest
    })

    const v5 = migrateScenarioV4ToV5(v1Like)

    expect(v5.schema_version).toBe(5)
    expect(Array.isArray(v5.rulers)).toBe(true)
    expect(Array.isArray(v5.eventChainStates)).toBe(true)
    expect(v5.reformStates).toEqual([])
    expect(v5.disasterStates).toEqual([])
    expect(v5.tradeRoutes).toEqual([])
    expect(v5.factionInfluences).toEqual([])
  })

  it('chains v2→v3→v4→v5 when raw data has schema_version=2', () => {
    const v5 = migrateScenarioV4ToV5({ ...scenarioV1, schema_version: 2 })

    expect(v5.schema_version).toBe(5)
    expect(v5.disasterStates).toEqual([])
    expect(v5.tradeRoutes).toEqual([])
    expect(v5.factionInfluences).toEqual([])
  })
})
