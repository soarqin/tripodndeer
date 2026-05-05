import scenarioV1 from '@/content/m1/scenario.json'
import { describe, expect, it } from 'vitest'
import { migrateScenarioV6ToV7 } from '../v6-to-v7'
import { ensureV8, migrateScenarioV7ToV8 } from '../v7-to-v8'
import m6SaveV6 from './fixtures/m6-save-v6.json'

type V8Shape = {
  schema_version: number
  realms: Array<{ id: string; status: string; [k: string]: unknown }>
  sites: Array<{ id: string; provinceId: unknown; [k: string]: unknown }>
  provinces: unknown[]
  regions: unknown[]
  characterTemplates: unknown[]
  localization: Record<string, string>
  generals?: unknown[]
  passes?: unknown[]
  adjacencyEdges?: unknown[]
  academies?: unknown[]
  intelligenceCoverage?: Record<string, number>
  counterIntelStates?: unknown[]
  spyMissions?: unknown[]
}

describe('migrateScenarioV7ToV8 — schema_version', () => {
  it('sets schema_version to 8 when chained from v5 source (m1/scenario.json)', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.schema_version).toBe(8)
  })

  it('sets schema_version to 8 when chained from v6 fixture', () => {
    const v8 = migrateScenarioV7ToV8(m6SaveV6) as unknown as V8Shape
    expect(v8.schema_version).toBe(8)
  })

  it('sets schema_version to 8 from explicit v7 input', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const v8 = migrateScenarioV7ToV8(v7) as unknown as V8Shape
    expect(v8.schema_version).toBe(8)
  })
})

describe('migrateScenarioV7ToV8 — new v8 fields default empty', () => {
  it('initializes provinces to empty array', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.provinces).toEqual([])
  })

  it('initializes regions to empty array', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.regions).toEqual([])
  })

  it('initializes characterTemplates to empty array', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.characterTemplates).toEqual([])
  })

  it('initializes localization to empty record', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.localization).toEqual({})
  })
})

describe('migrateScenarioV7ToV8 — site.provinceId default null', () => {
  it('adds provinceId=null to every site when missing', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    for (const site of v8.sites) {
      expect(site.provinceId).toBe(null)
    }
  })

  it('adds provinceId=null to v6 fixture site', () => {
    const v8 = migrateScenarioV7ToV8(m6SaveV6) as unknown as V8Shape
    expect(v8.sites).toHaveLength(1)
    expect(v8.sites[0]!.provinceId).toBe(null)
  })

  it('preserves existing provinceId when already present', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const v7WithProvince = {
      ...v7,
      sites: v7.sites.map((s, i) =>
        i === 0 ? { ...s, provinceId: 'province_guanzhong' } : s,
      ),
    }
    const v8 = migrateScenarioV7ToV8(v7WithProvince) as unknown as V8Shape
    expect(v8.sites[0]!.provinceId).toBe('province_guanzhong')
    expect(v8.sites[1]!.provinceId).toBe(null)
  })
})

describe('migrateScenarioV7ToV8 — realm.status default active', () => {
  it("adds status='active' to every realm when missing", () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    for (const realm of v8.realms) {
      expect(realm.status).toBe('active')
    }
  })

  it('preserves existing status when already present', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const v7WithStatus = {
      ...v7,
      realms: v7.realms.map((r, i) =>
        i === 0 ? { ...r, status: 'deactivated' as const } : r,
      ),
    }
    const v8 = migrateScenarioV7ToV8(v7WithStatus) as unknown as V8Shape
    expect(v8.realms[0]!.status).toBe('deactivated')
    expect(v8.realms[1]!.status).toBe('active')
  })
})

describe('migrateScenarioV7ToV8 — preserves v7 fields byte-equal', () => {
  it('preserves all 50 sites from m1 scenario', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.sites).toHaveLength(50)
  })

  it('preserves all 8 realms from m1 scenario', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.realms).toHaveLength(8)
  })

  it('preserves intelligenceCoverage from v7 (56 directional entries)', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(Object.keys(v8.intelligenceCoverage ?? {})).toHaveLength(56)
  })

  it('preserves counterIntelStates from v7 (8 realms)', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.counterIntelStates).toHaveLength(8)
  })

  it('preserves spyMissions from v7 (empty array)', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.spyMissions).toEqual([])
  })

  it('preserves passes (5) and adjacencyEdges (5) from v2', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.passes).toHaveLength(5)
    expect(v8.adjacencyEdges).toHaveLength(5)
  })

  it('preserves academies from v6 migration (jixia + xihe)', () => {
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.academies).toHaveLength(2)
  })

  it('preserves intelligenceCoverage values byte-equal between v7 and v8', () => {
    const v7 = migrateScenarioV6ToV7(scenarioV1)
    const v8 = migrateScenarioV7ToV8(scenarioV1) as unknown as V8Shape
    expect(v8.intelligenceCoverage).toEqual(v7.intelligenceCoverage)
  })
})

describe('ensureV8 — gating', () => {
  it('returns input unchanged when schema_version is already 8', () => {
    const v8Input = {
      schema_version: 8,
      sites: [],
      realms: [],
      provinces: [],
      regions: [],
      characterTemplates: [],
      localization: {},
    }
    const result = ensureV8(v8Input)
    expect(result).toBe(v8Input)
  })

  it('migrates v5 source to v8 (chains v5→v6→v7→v8)', () => {
    const result = ensureV8(scenarioV1) as unknown as V8Shape
    expect(result.schema_version).toBe(8)
    expect(result.provinces).toEqual([])
    expect(result.regions).toEqual([])
    expect(result.characterTemplates).toEqual([])
    expect(result.localization).toEqual({})
  })

  it('migrates v6 fixture to v8 (chains v6→v7→v8)', () => {
    const result = ensureV8(m6SaveV6) as unknown as V8Shape
    expect(result.schema_version).toBe(8)
    expect(result.realms[0]!.status).toBe('active')
    expect(result.sites[0]!.provinceId).toBe(null)
  })
})

describe('migrateScenarioV7ToV8 — determinism (pure function)', () => {
  it('is deterministic: same input → same output (scenarioV1)', () => {
    const a = migrateScenarioV7ToV8(scenarioV1)
    const b = migrateScenarioV7ToV8(scenarioV1)
    expect(a).toEqual(b)
  })

  it('does not mutate input', () => {
    const before = JSON.stringify(m6SaveV6)
    migrateScenarioV7ToV8(m6SaveV6)
    expect(JSON.stringify(m6SaveV6)).toBe(before)
  })
})
