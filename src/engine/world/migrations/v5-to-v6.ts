import {
  M1DataSchemaV5,
  M1DataSchemaV6,
  type M1DataV5,
  type M1DataV6,
} from '~/shared/schemas'
import type { Academy, CulturalTag, Ideology, RealmId } from '~/shared/types'
import { migrateScenarioV4ToV5 } from './v4-to-v5'

function ensureV5(rawData: unknown): M1DataV5 {
  const version = (rawData as { schema_version?: number } | null)?.schema_version
  if (version === undefined || version < 5) {
    return migrateScenarioV4ToV5(rawData)
  }
  return M1DataSchemaV5.parse(rawData)
}

function culturalTagForOwner(ownerId: string | null): CulturalTag {
  switch (ownerId) {
    case 'realm_qin':
      return 'chinese_qin'
    case 'realm_chu':
      return 'chinese_chu'
    case 'realm_qi':
      return 'chinese_qi'
    case 'realm_zhou':
      return 'chinese_zhou_central'
    case 'realm_yan':
      return 'chinese_yan'
    case 'realm_zhao':
      return 'chinese_zhao'
    case 'realm_wei':
      return 'chinese_wei'
    case 'realm_han':
      return 'chinese_han'
    default:
      return 'di_xirong'
  }
}

function prestigeForRealm(realmId: RealmId): number {
  switch (realmId) {
    case 'realm_qin':
    case 'realm_chu':
    case 'realm_qi':
      return 70
    case 'realm_yan':
    case 'realm_zhao':
    case 'realm_wei':
    case 'realm_han':
      return 55
    case 'realm_zhou':
      return 90
    default:
      return 40
  }
}

function zeroIdeologyLean(): Record<Ideology, number> {
  return { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
}

const DEFAULT_ACADEMIES: readonly Academy[] = [
  {
    id: 'jixia',
    hostRealmId: 'realm_qi',
    hostSiteId: 'site_005',
    primaryIdeology: 'ru',
    secondaryIdeology: 'dao',
    founded: 318,
    level: 1,
    status: 'active',
  },
  {
    id: 'xihe',
    hostRealmId: 'realm_wei',
    hostSiteId: 'site_032',
    primaryIdeology: 'fa',
    secondaryIdeology: 'bing',
    founded: 419,
    level: 1,
    status: 'active',
  },
]

export function migrateScenarioV5ToV6(rawData: unknown): M1DataV6 {
  const v5 = ensureV5(rawData)

  const sites = v5.sites.map(site => {
    const ownerId = v5.initialOwnership[site.id] ?? null
    return {
      ...site,
      cultural: site.cultural ?? culturalTagForOwner(ownerId),
      culturalIdentityStrength: site.culturalIdentityStrength ?? 100,
      lastConquestTick: site.lastConquestTick ?? null,
      lowIdentitySinceTick: site.lowIdentitySinceTick ?? null,
    }
  })

  const realms = v5.realms.map(realm => ({
    ...realm,
    prestige: prestigeForRealm(realm.id),
    ideologyLean: zeroIdeologyLean(),
    warVictoriesThisYear: 0,
  }))

  const migrated = {
    ...v5,
    schema_version: 6 as const,
    sites,
    realms,
    academies: [...DEFAULT_ACADEMIES],
  }

  return M1DataSchemaV6.parse(migrated)
}
