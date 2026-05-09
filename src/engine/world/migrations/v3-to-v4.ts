import {
  M1DataSchemaV3,
  M1DataSchemaV4,
  type M1DataV3,
  type M1DataV4,
} from '~/shared/schemas'
import type { PersonalityArchetype, RulerPersonalityProfile } from '~/shared/types'
import { migrateScenarioV1ToV3 } from './v1-to-v3'

const DEFAULT_PERSONALITY_DIMS: Readonly<Record<PersonalityArchetype, RulerPersonalityProfile>> = {
  conqueror: {
    expansionDrive: 0.85,
    caution: 0.3,
    vindictiveness: 0.6,
    patience: 0.3,
    diplomaticTrust: 0.4,
    honor: 0.5,
    reformInclination: 0.5,
    preferredStrategy: 'blitz',
  },
  steward: {
    expansionDrive: 0.2,
    caution: 0.7,
    vindictiveness: 0.2,
    patience: 0.7,
    diplomaticTrust: 0.6,
    honor: 0.6,
    reformInclination: 0.6,
    preferredStrategy: 'attrition',
  },
  schemer: {
    expansionDrive: 0.5,
    caution: 0.6,
    vindictiveness: 0.6,
    patience: 0.6,
    diplomaticTrust: 0.3,
    honor: 0.3,
    reformInclination: 0.4,
    preferredStrategy: 'diplomatic',
  },
  learned: {
    expansionDrive: 0.4,
    caution: 0.6,
    vindictiveness: 0.2,
    patience: 0.7,
    diplomaticTrust: 0.7,
    honor: 0.8,
    reformInclination: 0.4,
    preferredStrategy: 'diplomatic',
  },
  tyrant: {
    expansionDrive: 0.7,
    caution: 0.25,
    vindictiveness: 0.85,
    patience: 0.3,
    diplomaticTrust: 0.2,
    honor: 0.2,
    reformInclination: 0.3,
    preferredStrategy: 'blitz',
  },
  incompetent: {
    expansionDrive: 0.5,
    caution: 0.5,
    vindictiveness: 0.5,
    patience: 0.5,
    diplomaticTrust: 0.5,
    honor: 0.5,
    reformInclination: 0.5,
    preferredStrategy: 'attrition',
  },
  benevolent: {
    expansionDrive: 0.2,
    caution: 0.6,
    vindictiveness: 0.2,
    patience: 0.7,
    diplomaticTrust: 0.7,
    honor: 0.7,
    reformInclination: 0.5,
    preferredStrategy: 'diplomatic',
  },
  builder: {
    expansionDrive: 0.3,
    caution: 0.55,
    vindictiveness: 0.3,
    patience: 0.7,
    diplomaticTrust: 0.5,
    honor: 0.6,
    reformInclination: 0.85,
    preferredStrategy: 'siege',
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeV3RulerFields(rawData: unknown): unknown {
  if (!isRecord(rawData) || !Array.isArray(rawData.rulers)) return rawData

  return {
    ...rawData,
    rulers: rawData.rulers.map(ruler => {
      if (!isRecord(ruler) || ruler.personalityDims !== undefined) return ruler
      const personality =
        typeof ruler.personality === 'string'
          ? (ruler.personality as PersonalityArchetype)
          : 'incompetent'
      return {
        ...ruler,
        personalityDims: { ...DEFAULT_PERSONALITY_DIMS[personality] },
      }
    }),
  }
}

function ensureV3(rawData: unknown): M1DataV3 {
  const version = (rawData as { schema_version?: number } | null)?.schema_version
  if (version === undefined || version < 3) {
    return migrateScenarioV1ToV3(rawData)
  }
  return M1DataSchemaV3.parse(normalizeV3RulerFields(rawData))
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
