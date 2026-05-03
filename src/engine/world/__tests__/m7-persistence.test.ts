import { describe, expect, it } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { migrateScenarioV6ToV7 } from '~/engine/world/migrations/v6-to-v7'
import m6SaveV6 from '~/engine/world/migrations/__tests__/fixtures/m6-save-v6.json'
import { M1DataSchemaV7 } from '~/shared/schemas'
import { makeCoverageKey } from '~/shared/types'

describe('M7 persistence: V6→V7 auto-migration on load', () => {
  it('loadM1Data() returns V7 data with M7 fields populated', () => {
    const data = loadM1Data()
    expect(data.schema_version).toBe(7)
    expect(data.intelligenceCoverage).toBeDefined()
    expect(data.counterIntelStates).toBeDefined()
    expect(data.spyMissions).toBeDefined()
  })

  it('factory createWorldFromM1Data populates intelligenceCoverage Map for V6 fixture (3 realms → 6 keys)', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    const world = createWorldFromM1Data(v7, 42, 'realm_qin')

    expect(world.intelligenceCoverage.size).toBe(6)
  })

  it('factory createWorldFromM1Data populates spyMissions Map (empty for V6 fixture)', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    const world = createWorldFromM1Data(v7, 42, 'realm_qin')

    expect(world.spyMissions.size).toBe(0)
  })

  it('factory createWorldFromM1Data populates counterIntelStates Map (one per realm)', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    const world = createWorldFromM1Data(v7, 42, 'realm_qin')

    expect(world.counterIntelStates.size).toBe(3)
    expect(world.counterIntelStates.has('realm_qin')).toBe(true)
    expect(world.counterIntelStates.has('realm_chu')).toBe(true)
    expect(world.counterIntelStates.has('realm_qi')).toBe(true)
  })

  it('intelligenceCoverage uses directional keys (qin→chu ≠ chu→qin), all initialized to 0', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    const world = createWorldFromM1Data(v7, 42, 'realm_qin')

    for (const value of world.intelligenceCoverage.values()) {
      expect(value).toBe(0)
    }
    expect(world.intelligenceCoverage.has(makeCoverageKey('realm_qin', 'realm_chu'))).toBe(true)
    expect(world.intelligenceCoverage.has(makeCoverageKey('realm_chu', 'realm_qin'))).toBe(true)
    expect(world.intelligenceCoverage.has(makeCoverageKey('realm_qin', 'realm_qin'))).toBe(false)
  })

  it('counterIntelStates initialized with detectionLevel=0, lastUpdatedTick=0', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    const world = createWorldFromM1Data(v7, 42, 'realm_qin')

    for (const state of world.counterIntelStates.values()) {
      expect(state.detectionLevel).toBe(0)
      expect(state.lastUpdatedTick).toBe(0)
    }
  })
})

describe('M7 persistence: JSON round-trip preserves M7 fields', () => {
  it('preserves intelligenceCoverage through JSON.stringify + JSON.parse', () => {
    const data = loadM1Data()
    const json = JSON.stringify(data)
    const parsed = M1DataSchemaV7.parse(JSON.parse(json))

    expect(parsed.intelligenceCoverage).toEqual(data.intelligenceCoverage)
    expect(Object.keys(parsed.intelligenceCoverage)).toHaveLength(56)
  })

  it('preserves counterIntelStates through JSON round-trip', () => {
    const data = loadM1Data()
    const reparsed = M1DataSchemaV7.parse(JSON.parse(JSON.stringify(data)))

    expect(reparsed.counterIntelStates).toHaveLength(8)
    expect(reparsed.counterIntelStates).toEqual(data.counterIntelStates)
  })

  it('preserves spyMissions (empty by default) through JSON round-trip', () => {
    const data = loadM1Data()
    const reparsed = M1DataSchemaV7.parse(JSON.parse(JSON.stringify(data)))

    expect(reparsed.spyMissions).toEqual([])
    expect(reparsed.spyMissions).toEqual(data.spyMissions)
  })
})

describe('M7 persistence: full World round-trip', () => {
  it('V7 data → JSON → parse → World preserves M7 Maps from V6 fixture', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    const original = createWorldFromM1Data(v7, 42, 'realm_qin')

    const json = JSON.stringify(v7)
    const reparsed = M1DataSchemaV7.parse(JSON.parse(json))
    const reloaded = createWorldFromM1Data(reparsed, 42, 'realm_qin')

    expect(reloaded.intelligenceCoverage.size).toBe(original.intelligenceCoverage.size)
    expect(reloaded.spyMissions.size).toBe(original.spyMissions.size)
    expect(reloaded.counterIntelStates.size).toBe(original.counterIntelStates.size)

    for (const [key, value] of original.intelligenceCoverage) {
      expect(reloaded.intelligenceCoverage.get(key)).toBe(value)
    }
    for (const [realmId, state] of original.counterIntelStates) {
      expect(reloaded.counterIntelStates.get(realmId)).toEqual(state)
    }
  })
})

describe('M7 persistence: V6 raw → V7 migration determinism', () => {
  it('migrating raw V6 fixture twice yields deepEqual V7 data', () => {
    const v7a = migrateScenarioV6ToV7(m6SaveV6)
    const v7b = migrateScenarioV6ToV7(m6SaveV6)
    expect(v7a).toEqual(v7b)
  })

  it('migrated V6→V7 data is schema-valid', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    expect(() => M1DataSchemaV7.parse(v7)).not.toThrow()
  })

  it('loading V6 fixture twice through factory yields equivalent World M7 Maps', () => {
    const v7a = migrateScenarioV6ToV7(m6SaveV6)
    const v7b = migrateScenarioV6ToV7(m6SaveV6)
    const worldA = createWorldFromM1Data(v7a, 42, 'realm_qin')
    const worldB = createWorldFromM1Data(v7b, 42, 'realm_qin')

    expect([...worldA.intelligenceCoverage.entries()]).toEqual(
      [...worldB.intelligenceCoverage.entries()],
    )
    expect([...worldA.counterIntelStates.entries()]).toEqual(
      [...worldB.counterIntelStates.entries()],
    )
    expect(worldA.spyMissions.size).toBe(worldB.spyMissions.size)
  })
})

describe('M7 persistence: full M1 scenario (V7) has 6 spies and 8-realm M7 state', () => {
  it('generals Map has ≥6 spies with specialty=spy', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')

    const spies = [...world.generals.values()].filter(g => g.specialty === 'spy')
    expect(spies.length).toBeGreaterThanOrEqual(6)
  })

  it('intelligenceCoverage.size is 56 (8 realms × 7 targets)', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    expect(world.intelligenceCoverage.size).toBe(56)
  })

  it('counterIntelStates.size is 8 (one per realm)', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    expect(world.counterIntelStates.size).toBe(8)
  })

  it('spyMissions starts empty', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    expect(world.spyMissions.size).toBe(0)
  })
})
