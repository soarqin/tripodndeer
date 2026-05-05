import {
  M1DataSchemaV7,
  type M1DataV7,
  type M1DataV8,
} from '~/shared/schemas'
import { migrateScenarioV6ToV7 } from './v6-to-v7'

type SiteV7 = M1DataV7['sites'][number]
type RealmV7 = M1DataV7['realms'][number]

type SiteV8 = SiteV7 & { provinceId: string | null }
type RealmV8 = RealmV7 & { status: 'active' | 'deactivated' }

function readSchemaVersion(rawData: unknown): number | undefined {
  if (rawData === null || typeof rawData !== 'object') return undefined
  const sv = (rawData as { schema_version?: unknown }).schema_version
  return typeof sv === 'number' ? sv : undefined
}

function ensureV7(rawData: unknown): M1DataV7 {
  const version = readSchemaVersion(rawData)
  if (version === undefined || version < 7) {
    return migrateScenarioV6ToV7(rawData)
  }
  M1DataSchemaV7.parse(rawData)
  return rawData as M1DataV7
}

function migrateSites(sites: readonly SiteV7[]): readonly SiteV8[] {
  return sites.map(site => {
    const existing = (site as { provinceId?: string | null }).provinceId
    return {
      ...site,
      provinceId: existing ?? null,
    }
  })
}

function migrateRealms(realms: readonly RealmV7[]): readonly RealmV8[] {
  return realms.map(realm => ({
    ...realm,
    status: realm.status ?? 'active',
  }))
}

function readArrayField(source: Record<string, unknown>, field: string): unknown[] {
  const value = source[field]
  return Array.isArray(value) ? (value as unknown[]) : []
}

function readLocalization(source: Record<string, unknown>): Record<string, string> {
  const value = source.localization
  if (value === null || typeof value !== 'object') return {}
  return value as Record<string, string>
}

export function migrateScenarioV7ToV8(rawData: unknown): M1DataV8 {
  const v7 = ensureV7(rawData)
  const v7AsRecord = v7 as unknown as Record<string, unknown>

  const sites = migrateSites(v7.sites)
  const realms = migrateRealms(v7.realms)

  const migrated = {
    ...v7,
    schema_version: 8 as const,
    sites,
    realms,
    provinces: readArrayField(v7AsRecord, 'provinces'),
    regions: readArrayField(v7AsRecord, 'regions'),
    characterTemplates: readArrayField(v7AsRecord, 'characterTemplates'),
    localization: readLocalization(v7AsRecord),
  }

  return migrated as unknown as M1DataV8
}

export function ensureV8(rawData: unknown): M1DataV8 {
  const version = readSchemaVersion(rawData)
  if (version !== undefined && version >= 8) {
    return rawData as M1DataV8
  }
  return migrateScenarioV7ToV8(rawData)
}
