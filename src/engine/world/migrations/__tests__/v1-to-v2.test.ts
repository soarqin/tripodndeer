import scenarioV1 from '@/content/m1/scenario.json'
import { createWorldFromM1Data } from '@/engine/world/factory'
import { migrateScenarioV1ToV2 } from '../v1-to-v2'
import { migrateScenarioV2ToV3 } from '../v2-to-v3'
import { M1DataSchema, M1DataSchemaV2 } from '@/shared/schemas'
import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

describe('migrateScenarioV1ToV2', () => {
  it('migrates v1 data with no schema_version', () => {
    const migrated = migrateScenarioV1ToV2(scenarioV1)

    expect(migrated.schema_version).toBe(2)
    expect(migrated.generals).toEqual([])
    expect(migrated.passes).toEqual([])
    expect(migrated.adjacencyEdges).toEqual([])
    expect(migrated.peaceProposals).toEqual([])
    expect(migrated.relations).toEqual([])
    expect(migrated.diplomaticProposals).toEqual([])
    expect(migrated.treaties).toEqual([])
    expect(migrated.diplomacyHistory).toEqual([])
    expect(migrated.coalitions).toEqual([])
    expect(migrated.zhouInvestiture).toEqual([])
    expect(migrated.realms).toHaveLength(8)
    for (const realm of migrated.realms) {
      expect(realm.stats).toEqual({ manpowerPool: 50000, manpowerCap: 80000, warWeariness: 0 })
    }

    const world = createWorldFromM1Data(migrateScenarioV2ToV3(migrated), 99, 'realm_qin')
    expect(world.sites.size).toBe(50)
    expect(world.realms.size).toBe(8)
    expect(world.armies.size).toBe(16)
    expect(world.relations.size).toBe(0)
    expect(world.diplomaticProposals.size).toBe(0)
    expect(world.treaties.size).toBe(0)
    expect(world.diplomacyHistory).toEqual([])
    expect(world.coalitions.size).toBe(0)
    expect(world.zhouInvestiture.size).toBe(0)
    expect(world.generals.size).toBe(0)
    expect(world.passes.size).toBe(0)
    expect(world.adjacencyEdges.size).toBe(0)
    expect(world.peaceProposals.size).toBe(0)
    expect(world.sieges.size).toBe(0)
  })

  it('migrates v1 data with explicit schema_version 1', () => {
    const migrated = migrateScenarioV1ToV2({ ...scenarioV1, schema_version: 1 })

    expect(migrated.schema_version).toBe(2)
    expect(migrated.realms).toHaveLength(8)
    expect(migrated.realms.every(realm => realm.stats?.manpowerCap === 80000)).toBe(true)
  })

  it('accepts already migrated v2 data', () => {
    const v2 = M1DataSchemaV2.parse({
      ...scenarioV1,
      schema_version: 2,
      realms: scenarioV1.realms.map(realm => ({
        ...realm,
        stats: { manpowerPool: 50000, manpowerCap: 80000, warWeariness: 0 },
      })),
      generals: [],
      passes: [],
      adjacencyEdges: [],
      peaceProposals: [],
      relations: [],
      diplomaticProposals: [],
      treaties: [],
      diplomacyHistory: [],
      coalitions: [],
      zhouInvestiture: [],
    })

    expect(v2.schema_version).toBe(2)
    expect(v2.realms[0]?.stats).toEqual({ manpowerPool: 50000, manpowerCap: 80000, warWeariness: 0 })
  })

  it('throws ZodError on corrupted v1 data', () => {
    const bad = {
      ...scenarioV1,
      realms: scenarioV1.realms.map((realm, index) =>
        index === 0 ? { ...realm, capital: undefined } : realm,
      ),
    }

    expect(() => migrateScenarioV1ToV2(bad)).toThrow(ZodError)
    expect(() => M1DataSchema.parse(bad)).toThrow(ZodError)
  })
})
