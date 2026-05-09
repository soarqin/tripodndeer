import {
  M1DataSchema,
  M1DataSchemaV2,
  M1DataSchemaV3,
  type M1DataV2,
  type M1DataV3,
} from '~/shared/schemas'
import { M5_PERSONALITY_DIMS_BASELINE } from '~/content/m2/balance/m5'
import type { AIPersonality, PersonalityArchetype } from '~/shared/types'

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

function mapLegacyAiPersonality(ai: AIPersonality): PersonalityArchetype {
  switch (ai) {
    case 'aggressive':
      return 'conqueror'
    case 'cautious':
      return 'steward'
    case 'aggressive_random':
      return 'schemer'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLegacyAiPersonality(value: unknown): value is AIPersonality {
  return value === 'aggressive' || value === 'cautious' || value === 'aggressive_random'
}

function isPersonalityArchetype(value: unknown): value is PersonalityArchetype {
  return typeof value === 'string' && PERSONALITY_ARCHETYPES.includes(value as PersonalityArchetype)
}

function normalizeRealmFields(realm: unknown): unknown {
  if (!isRecord(realm)) return realm
  const { aiPersonality: legacyAiPersonality, ...withoutLegacyAi } = realm
  if (withoutLegacyAi.archetype !== undefined) return withoutLegacyAi
  if (!isLegacyAiPersonality(legacyAiPersonality)) return withoutLegacyAi
  return { ...withoutLegacyAi, archetype: mapLegacyAiPersonality(legacyAiPersonality) }
}

function normalizeRawRealmFields(rawData: unknown): unknown {
  if (!isRecord(rawData) || !Array.isArray(rawData.realms)) return rawData
  return { ...rawData, realms: rawData.realms.map(normalizeRealmFields) }
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
  const normalized = normalizeRawRealmFields(rawData)
  if (!isRecord(normalized) || !Array.isArray(normalized.realms)) return new Map()

  const archetypes = new Map<string, PersonalityArchetype>()
  for (const realm of normalized.realms) {
    if (!isRecord(realm) || typeof realm.id !== 'string') continue
    if (isPersonalityArchetype(realm.archetype)) archetypes.set(realm.id, realm.archetype)
  }
  return archetypes
}

function v1ToV2(rawData: unknown): M1DataV2 {
  const normalized = normalizeRawRealmFields(rawData)
  const v1 = M1DataSchema.parse(stripV1OnlyRealmFields(normalized))
  const realmArchetypes = getNormalizedRealmArchetypes(normalized)
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
  return M1DataSchemaV2.parse(normalizeRawRealmFields(rawData))
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
      personalityDims: { ...M5_PERSONALITY_DIMS_BASELINE[realm.archetype ?? 'incompetent'] },
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
