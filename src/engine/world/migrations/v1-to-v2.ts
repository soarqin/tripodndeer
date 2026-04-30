import { M1DataSchema, M1DataSchemaV2, type M1DataV2 } from '~/shared/schemas'

export function migrateScenarioV1ToV2(rawData: unknown): M1DataV2 {
  const v1 = M1DataSchema.parse(rawData)
  const migrated = {
    ...v1,
    schema_version: 2 as const,
    sites: v1.sites.map(site => ({
      ...site,
      terrainType: (site as { terrainType?: string }).terrainType ?? 'plains',
    })),
    realms: v1.realms.map(realm => ({
      ...realm,
      stats: { manpowerPool: 50000, manpowerCap: 80000, warWeariness: 0 },
    })),
    generals: [] as unknown[],
    passes: [] as unknown[],
    adjacencyEdges: [] as unknown[],
    peaceProposals: [] as unknown[],
  }
  return M1DataSchemaV2.parse(migrated)
}
