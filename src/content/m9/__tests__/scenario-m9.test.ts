import { describe, it, expect } from 'vitest'
import scenario from '~/content/m9/scenario-453bc.json'
import {
  M9_SITE_COUNT,
  M9_REALM_COUNT,
  M9_REGION_COUNT,
  M9_CHARACTER_TEMPLATE_COUNT,
  M9_PLAYABLE_REALMS,
  M9_AI_ONLY_REALMS,
  M8_PERSONALITY_ARCHETYPE_LIST,
} from '~/content/m2/balance'

interface SiteShape { id: string }
interface RealmShape { id: string; capital?: string; archetype?: string }
interface PassShape { id: string }
interface ProvinceShape { id: string }
interface RegionShape { id: string }
interface CharTemplateShape { id: string }

describe('M9 scenario-453bc invariants', () => {
  it('Test 1: scenario file exists and is valid JSON', () => {
    expect(scenario).toBeDefined()
    expect(typeof scenario).toBe('object')
  })

  it('Test 2: sites count = 250', () => {
    const sites = (scenario.sites ?? []) as readonly SiteShape[]
    expect(sites.length).toBe(M9_SITE_COUNT)
  })

  it('Test 3: realms count = 12', () => {
    const realms = (scenario.realms ?? []) as readonly RealmShape[]
    expect(realms.length).toBe(M9_REALM_COUNT)
  })

  it('Test 4: provinces count in [30, 40]', () => {
    const provinces = (scenario.provinces ?? []) as readonly ProvinceShape[]
    expect(provinces.length).toBeGreaterThanOrEqual(30)
    expect(provinces.length).toBeLessThanOrEqual(40)
  })

  it('Test 5: regions count = 9', () => {
    const regions = (scenario.regions ?? []) as readonly RegionShape[]
    expect(regions.length).toBe(M9_REGION_COUNT)
  })

  it('Test 6: passes count in [18, 20]', () => {
    const passes = (scenario.passes ?? []) as readonly PassShape[]
    expect(passes.length).toBeGreaterThanOrEqual(18)
    expect(passes.length).toBeLessThanOrEqual(20)
  })

  it('Test 7: characterTemplates count = 90', () => {
    const templates = (scenario.characterTemplates ?? []) as readonly CharTemplateShape[]
    expect(templates.length).toBe(M9_CHARACTER_TEMPLATE_COUNT)
  })

  it('Test 8: 8 playable realms present', () => {
    const realms = (scenario.realms ?? []) as readonly RealmShape[]
    const realmIds = realms.map((r) => r.id)
    for (const id of M9_PLAYABLE_REALMS) {
      expect(realmIds, `Missing playable realm ${id}`).toContain(id)
    }
  })

  it('Test 9: 4 AI-only realms present', () => {
    const realms = (scenario.realms ?? []) as readonly RealmShape[]
    const realmIds = realms.map((r) => r.id)
    for (const id of M9_AI_ONLY_REALMS) {
      expect(realmIds, `Missing AI-only realm ${id}`).toContain(id)
    }
  })

  it('Test 10: all realms have capital site reference', () => {
    const sites = (scenario.sites ?? []) as readonly SiteShape[]
    const realms = (scenario.realms ?? []) as readonly RealmShape[]
    const siteIds = new Set(sites.map((s) => s.id))
    for (const realm of realms) {
      if (realm.capital !== undefined && realm.capital !== null) {
        expect(
          siteIds.has(realm.capital),
          `Realm ${realm.id} capital ${realm.capital} not in sites`,
        ).toBe(true)
      }
    }
  })

  it('Test 11: schema_version is 8', () => {
    expect(scenario.schema_version).toBe(8)
  })

  it('Test 12: all realms have valid archetype', () => {
    const realms = (scenario.realms ?? []) as readonly RealmShape[]
    const validArchetypes = new Set<string>(M8_PERSONALITY_ARCHETYPE_LIST)
    for (const realm of realms) {
      if (realm.archetype !== undefined && realm.archetype !== null) {
        expect(
          validArchetypes.has(realm.archetype),
          `Realm ${realm.id} has invalid archetype: ${realm.archetype}`,
        ).toBe(true)
      }
    }
  })
})
