import { M7_COVERAGE_TIER_1 } from '~/content/m2/balance'
import { computeRealmAdjacency } from '~/engine/systems/espionage/adjacency'
import {
  M1DataSchemaV6,
  M1DataSchemaV7,
  type M1DataV6,
  type M1DataV7,
} from '~/shared/schemas'
import { makeCoverageKey } from '~/shared/types'
import { migrateScenarioV5ToV6 } from './v5-to-v6'

function ensureV6(rawData: unknown): M1DataV6 {
  const version = (rawData as { schema_version?: number } | null)?.schema_version
  if (version === undefined || version < 6) {
    return migrateScenarioV5ToV6(rawData)
  }
  return M1DataSchemaV6.parse(rawData)
}

export function migrateScenarioV6ToV7(rawData: unknown): M1DataV7 {
  const v6 = ensureV6(rawData)

  const realmIds = v6.realms.map(r => r.id).sort((a, b) => a.localeCompare(b))
  const adjacency = computeRealmAdjacency(v6.sites, v6.initialOwnership)

  const intelligenceCoverage: Record<string, number> = {}
  for (const observerId of realmIds) {
    for (const targetId of realmIds) {
      if (observerId === targetId) continue
      const isAdjacent = adjacency.get(observerId)?.has(targetId) ?? false
      intelligenceCoverage[makeCoverageKey(observerId, targetId)] = isAdjacent
        ? M7_COVERAGE_TIER_1
        : 0
    }
  }

  const counterIntelStates = realmIds.map(realmId => ({
    realmId,
    detectionLevel: 0,
    lastUpdatedTick: 0,
  }))

  const migrated = {
    ...v6,
    schema_version: 7 as const,
    intelligenceCoverage,
    counterIntelStates,
    spyMissions: [],
  }

  return M1DataSchemaV7.parse(migrated)
}
