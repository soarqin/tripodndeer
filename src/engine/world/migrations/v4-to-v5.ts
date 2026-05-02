import {
  M1DataSchemaV4,
  M1DataSchemaV5,
  type M1DataV4,
  type M1DataV5,
} from '~/shared/schemas'
import { migrateScenarioV3ToV4 } from './v3-to-v4'

function ensureV4(rawData: unknown): M1DataV4 {
  const version = (rawData as { schema_version?: number } | null)?.schema_version
  if (version === undefined || version < 4) {
    return migrateScenarioV3ToV4(rawData)
  }
  return M1DataSchemaV4.parse(rawData)
}

export function migrateScenarioV4ToV5(rawData: unknown): M1DataV5 {
  const v4 = ensureV4(rawData)

  const migrated = {
    ...v4,
    schema_version: 5 as const,
    disasterStates: [],
    tradeRoutes: [],
    factionInfluences: [],
  }

  return M1DataSchemaV5.parse(migrated)
}
