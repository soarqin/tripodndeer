import scenarioV1 from '@/content/m1/scenario.json'
import { makeCoverageKey } from '@/shared/types'
import { describe, expect, it } from 'vitest'
import { migrateScenarioV5ToV6 } from '../v5-to-v6'
import { migrateScenarioV6ToV7 } from '../v6-to-v7'
import m5SaveV3 from './fixtures/m5-save-v3.json'
import m6SaveV6 from './fixtures/m6-save-v6.json'

describe('migrateScenarioV6ToV7 — schema_version', () => {
  it('sets schema_version to 7', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    expect(v7.schema_version).toBe(7)
  })

  it('sets schema_version to 7 from full scenario chain', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    expect(v7.schema_version).toBe(7)
  })
})

describe('migrateScenarioV6ToV7 — intelligenceCoverage', () => {
  it('produces 56 directional coverage entries for 8-realm scenario', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    expect(Object.keys(v7.intelligenceCoverage)).toHaveLength(56)
  })

  it('initializes every coverage value to 0', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    for (const value of Object.values(v7.intelligenceCoverage)) {
      expect(value).toBe(0)
    }
  })

  it('uses directional keys (qin→chu different from chu→qin)', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const qinToChu = makeCoverageKey('realm_qin', 'realm_chu')
    const chuToQin = makeCoverageKey('realm_chu', 'realm_qin')

    expect(qinToChu).not.toBe(chuToQin)
    expect(v7.intelligenceCoverage[qinToChu]).toBe(0)
    expect(v7.intelligenceCoverage[chuToQin]).toBe(0)
  })

  it('does not include self-coverage (qin→qin)', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const selfKey = makeCoverageKey('realm_qin', 'realm_qin')
    expect(v7.intelligenceCoverage[selfKey]).toBeUndefined()
  })

  it('produces N×(N-1) entries for N realms (3-realm fixture → 6 entries)', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    expect(Object.keys(v7.intelligenceCoverage)).toHaveLength(6)
  })

  it('covers all observer→target pairs for all realms', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const realmIds = ['realm_qin', 'realm_chu', 'realm_qi', 'realm_yan', 'realm_han', 'realm_zhao', 'realm_wei', 'realm_zhou']

    for (const observer of realmIds) {
      for (const target of realmIds) {
        if (observer === target) continue
        const key = makeCoverageKey(observer, target)
        expect(v7.intelligenceCoverage[key]).toBe(0)
      }
    }
  })
})

describe('migrateScenarioV6ToV7 — counterIntelStates', () => {
  it('produces 8 counterIntelStates for 8-realm scenario', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    expect(v7.counterIntelStates).toHaveLength(8)
  })

  it('initializes every state with detectionLevel=0 and lastUpdatedTick=0', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    for (const state of v7.counterIntelStates) {
      expect(state.detectionLevel).toBe(0)
      expect(state.lastUpdatedTick).toBe(0)
    }
  })

  it('produces one state per realm (alphabetically sorted)', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const realmIds = v7.counterIntelStates.map(s => s.realmId)
    expect(realmIds).toEqual([...realmIds].sort())
  })

  it('includes all 8 canonical realms', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const realmIds = v7.counterIntelStates.map(s => s.realmId).sort()
    expect(realmIds).toEqual([
      'realm_chu',
      'realm_han',
      'realm_qi',
      'realm_qin',
      'realm_wei',
      'realm_yan',
      'realm_zhao',
      'realm_zhou',
    ])
  })
})

describe('migrateScenarioV6ToV7 — spyMissions', () => {
  it('initializes spyMissions to an empty array', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    expect(v7.spyMissions).toEqual([])
  })

  it('initializes spyMissions to an empty array from V6 fixture', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    expect(v7.spyMissions).toEqual([])
  })
})

describe('migrateScenarioV6ToV7 — determinism (pure function)', () => {
  it('is deterministic: same input → same output (scenarioV1)', () => {
    const result1 = migrateScenarioV6ToV7(scenarioV1)
    const result2 = migrateScenarioV6ToV7(scenarioV1)
    expect(result1).toEqual(result2)
  })

  it('is deterministic: same input → same output (V6 fixture)', () => {
    const result1 = migrateScenarioV6ToV7(m6SaveV6)
    const result2 = migrateScenarioV6ToV7(m6SaveV6)
    expect(result1).toEqual(result2)
  })

  it('chains v3→v4→v5→v6→v7 when input is v3', () => {
    const v7 = migrateScenarioV6ToV7(m5SaveV3)
    expect(v7.schema_version).toBe(7)
    expect(Object.keys(v7.intelligenceCoverage)).toHaveLength(2)
    expect(v7.counterIntelStates).toHaveLength(2)
  })

  it('chains v5→v6→v7 when input is v5', () => {
    const v5 = migrateScenarioV5ToV6(m5SaveV3)
    const v7 = migrateScenarioV6ToV7(v5)
    expect(v7.schema_version).toBe(7)
  })
})

describe('migrateScenarioV6ToV7 — preserves V6 fields', () => {
  it('preserves academies (jixia + xihe) from V5→V6 migration', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    expect(v7.academies).toHaveLength(2)
    expect(v7.academies.map(a => a.id).sort()).toEqual(['jixia', 'xihe'])
  })

  it('preserves all 50 sites from M1 scenario', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    expect(v7.sites).toHaveLength(50)
  })

  it('preserves realm prestige from V5→V6 migration', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const zhou = v7.realms.find(r => r.id === 'realm_zhou')!
    expect(zhou.prestige).toBe(90)
  })

  it('preserves passes (5) and adjacencyEdges (5)', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    expect(v7.passes).toHaveLength(5)
    expect(v7.adjacencyEdges).toHaveLength(5)
  })

  it('preserves generals (≥6 spies present from T1.8)', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const spies = v7.generals.filter(g => g.specialty === 'spy')
    expect(spies.length).toBeGreaterThanOrEqual(6)
  })
})

describe('migrateScenarioV6ToV7 — V6 save fixture', () => {
  it('loads minimal V6 fixture correctly', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    expect(v7.realms).toHaveLength(3)
    expect(v7.sites).toHaveLength(1)
  })

  it('produces 6 directional coverage entries for 3-realm fixture', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    expect(Object.keys(v7.intelligenceCoverage)).toHaveLength(6)
  })

  it('produces 3 counterIntelStates for 3-realm fixture', () => {
    const v7 = migrateScenarioV6ToV7(m6SaveV6)
    expect(v7.counterIntelStates).toHaveLength(3)
    const realmIds = v7.counterIntelStates.map(s => s.realmId)
    expect(realmIds).toContain('realm_qin')
    expect(realmIds).toContain('realm_chu')
    expect(realmIds).toContain('realm_qi')
  })
})
