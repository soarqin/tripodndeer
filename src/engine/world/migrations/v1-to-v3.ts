import {
  M1DataSchema,
  M1DataSchemaV2,
  M1DataSchemaV3,
  type M1DataV2,
  type M1DataV3,
} from '~/shared/schemas'
import type { PersonalityArchetype, RulerPersonalityProfile } from '~/shared/types'

const PERSONALITY_ARCHETYPES: readonly PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

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

function isPersonalityArchetype(value: unknown): value is PersonalityArchetype {
  return typeof value === 'string' && PERSONALITY_ARCHETYPES.includes(value as PersonalityArchetype)
}

function stripRealmV2Fields(realm: unknown): unknown {
  if (!isRecord(realm)) return realm
  const v1Realm = { ...realm }
  delete v1Realm.archetype
  delete v1Realm.stats
  return v1Realm
}

function stripV1OnlyRealmFields(rawData: unknown): unknown {
  if (!isRecord(rawData) || !Array.isArray(rawData.realms)) return rawData
  return { ...rawData, realms: rawData.realms.map(stripRealmV2Fields) }
}

function getNormalizedRealmArchetypes(rawData: unknown): ReadonlyMap<string, PersonalityArchetype> {
  if (!isRecord(rawData) || !Array.isArray(rawData.realms)) return new Map()

  const archetypes = new Map<string, PersonalityArchetype>()
  for (const realm of rawData.realms) {
    if (!isRecord(realm) || typeof realm.id !== 'string') continue
    if (isPersonalityArchetype(realm.archetype)) archetypes.set(realm.id, realm.archetype)
  }
  return archetypes
}

function v1ToV2(rawData: unknown): M1DataV2 {
  const v1 = M1DataSchema.parse(stripV1OnlyRealmFields(rawData))
  const realmArchetypes = getNormalizedRealmArchetypes(rawData)
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
      ...(realmArchetypes.has(realm.id) ? { archetype: realmArchetypes.get(realm.id) } : {}),
    })),
    generals: [] as unknown[],
    passes: [] as unknown[],
    adjacencyEdges: [] as unknown[],
    peaceProposals: [] as unknown[],
    relations: [] as unknown[],
    diplomaticProposals: [] as unknown[],
    treaties: [] as unknown[],
    diplomacyHistory: [] as unknown[],
    coalitions: [] as unknown[],
    zhouInvestiture: [] as unknown[],
  }
  return M1DataSchemaV2.parse(migrated)
}

function ensureV2(rawData: unknown): M1DataV2 {
  const version = (rawData as { schema_version?: number } | null)?.schema_version
  if (version === undefined || version < 2) {
    return v1ToV2(rawData)
  }
  return M1DataSchemaV2.parse(rawData)
}

function v2ToV3(v2: M1DataV2): M1DataV3 {
  const generals = v2.generals.map(gen => {
    const attrs = gen.attrs ?? {
      wu: gen.might,
      zheng: 10,
      jiao: 10,
      mou: gen.strategy ?? 10,
      xue: gen.learning ?? 10,
      po: 10,
    }
    const specialty = gen.specialty ?? (gen.might >= 15 ? 'commander' : 'administrator')
    const ambition = gen.ambition ?? 'mid'
    const age = gen.age ?? 30
    const posts = gen.posts ?? []
    const loyaltyState = gen.loyaltyState ?? 'loyal'
    return {
      ...gen,
      attrs,
      specialty,
      ambition,
      age,
      posts,
      loyaltyState,
    }
  })

  const realms = v2.realms.map(realm => {
    if (realm.rulerId !== undefined && realm.rulerId !== null) {
      return realm
    }
    const inRealm = generals.filter(g => g.realmId === realm.id)
    if (inRealm.length === 0) {
      return { ...realm, rulerId: null }
    }
    const ruler = inRealm.find(g => g.posts.includes('ruler'))
    if (ruler !== undefined) {
      return { ...realm, rulerId: ruler.id }
    }
    const sorted = [...inRealm].sort((a, b) => b.might - a.might)
    return { ...realm, rulerId: sorted[0]!.id }
  })

  const rulers = realms
    .filter(realm => realm.rulerId !== null && realm.rulerId !== undefined)
    .map(realm => ({
      realmId: realm.id,
      generalId: realm.rulerId as string,
      age: 45,
      lifespan: 65,
      health: 80,
      personality: realm.archetype ?? 'incompetent',
      personalityDims: { ...DEFAULT_PERSONALITY_DIMS[realm.archetype ?? 'incompetent'] },
      successionLawId: 'primogeniture' as const,
      inOfficeSinceTick: 0,
    }))

  const migrated = {
    ...v2,
    schema_version: 3 as const,
    generals,
    realms,
    rulers,
    eventChainStates: [],
  }

  return M1DataSchemaV3.parse(migrated)
}

export function migrateScenarioV1ToV3(rawData: unknown): M1DataV3 {
  const v2 = ensureV2(rawData)
  return v2ToV3(v2)
}
