import {
  M1DataSchemaV3,
  M1DataSchemaV4,
  type M1DataV3,
  type M1DataV4,
} from '~/shared/schemas'
import { migrateScenarioV2ToV3 } from './v2-to-v3'

function ensureV3(rawData: unknown): M1DataV3 {
  const version = (rawData as { schema_version?: number } | null)?.schema_version
  if (version === undefined || version < 3) {
    return migrateScenarioV2ToV3(rawData)
  }
  return M1DataSchemaV3.parse(rawData)
}

export function migrateScenarioV3ToV4(rawData: unknown): M1DataV4 {
  const v3 = ensureV3(rawData)

  const realms = v3.realms.map(realm => ({
    ...realm,
    traits: realm.traits ?? [],
    politicalSystem: realm.politicalSystem ?? 'enfeoffment',
  }))

  const rulers = v3.rulers.map(ruler => ({
    ...ruler,
    inOfficeSinceTick: ruler.inOfficeSinceTick ?? 0,
  }))

  const migrated = {
    ...v3,
    schema_version: 4 as const,
    realms,
    rulers,
    reformStates: [],
  }

  return M1DataSchemaV4.parse(migrated)
}
