import scenarioRaw from '@/content/m1/scenario.json'
import { describe, expect, it } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { migrateScenarioV5ToV6 } from '~/engine/world/migrations/v5-to-v6'
import { M1DataSchemaV6, M1DataSchemaV7, type M1DataV7 } from '~/shared/schemas'
import type { Academy } from '~/shared/types'

describe('M6 persistence: V5→V6 auto-migration on load', () => {
  it('loadM1Data() returns latest version (V7) data even though scenario.json is V5', () => {
    const data = loadM1Data()
    expect(data.schema_version).toBe(7)
    expect(data.academies).toHaveLength(2)
  })

  it('factory createWorldFromM1Data populates academies Map', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')

    expect(world.academies.size).toBe(2)
    expect(world.academies.has('jixia')).toBe(true)
    expect(world.academies.has('xihe')).toBe(true)
  })
})

describe('M6 persistence: JSON round-trip', () => {
  it('preserves academies array through JSON.stringify + JSON.parse', () => {
    const data = loadM1Data()
    const json = JSON.stringify(data)
    const parsed = M1DataSchemaV7.parse(JSON.parse(json))

    expect(parsed.academies).toEqual(data.academies)
    expect(parsed.schema_version).toBe(7)
  })

  it('preserves academies fully (id, host, ideology, founded, level, status)', () => {
    const data = loadM1Data()
    const reparsed = M1DataSchemaV7.parse(JSON.parse(JSON.stringify(data)))

    const jixia = reparsed.academies.find(a => a.id === 'jixia')!
    expect(jixia.hostRealmId).toBe('realm_qi')
    expect(jixia.hostSiteId).toBe('site_005')
    expect(jixia.primaryIdeology).toBe('ru')
    expect(jixia.secondaryIdeology).toBe('dao')
    expect(jixia.founded).toBe(318)
    expect(jixia.level).toBe(1)
    expect(jixia.status).toBe('active')
  })

  it('preserves cultural / culturalIdentityStrength on sites', () => {
    const data = loadM1Data()
    const reparsed = M1DataSchemaV7.parse(JSON.parse(JSON.stringify(data)))

    const linzi = reparsed.sites.find(s => s.id === 'site_005')!
    expect(linzi.cultural).toBe('chinese_qi')
    expect(linzi.culturalIdentityStrength).toBe(100)
    expect(linzi.lastConquestTick).toBe(null)
  })

  it('preserves prestige / ideologyLean / warVictoriesThisYear on realms', () => {
    const data = loadM1Data()
    const reparsed = M1DataSchemaV7.parse(JSON.parse(JSON.stringify(data)))

    const zhou = reparsed.realms.find(r => r.id === 'realm_zhou')!
    expect(zhou.prestige).toBe(90)
    expect(zhou.ideologyLean).toEqual({ fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 })
    expect(zhou.warVictoriesThisYear).toBe(0)
  })
})

describe('M6 persistence: full World round-trip', () => {
  it('World → array → JSON → parse → World preserves academies', () => {
    const original = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')

    const academiesArray: Academy[] = [...original.academies.values()].map(a => ({ ...a }))
    const serialisable: M1DataV7 = { ...loadM1Data(), academies: academiesArray }
    const json = JSON.stringify(serialisable)
    const reparsed = M1DataSchemaV7.parse(JSON.parse(json))
    const reloaded = createWorldFromM1Data(reparsed, 42, 'realm_qin')

    expect(reloaded.academies.size).toBe(original.academies.size)
    for (const [id, academy] of original.academies) {
      expect(reloaded.academies.get(id)).toEqual(academy)
    }
  })

  it('World → array → JSON → parse → World preserves site cultural state', () => {
    const original = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')

    const reparsed = M1DataSchemaV7.parse(JSON.parse(JSON.stringify(loadM1Data())))
    const reloaded = createWorldFromM1Data(reparsed, 42, 'realm_qin')

    for (const [id, originalSite] of original.sites) {
      const reloadedSite = reloaded.sites.get(id)!
      expect(reloadedSite.cultural).toBe(originalSite.cultural)
      expect(reloadedSite.culturalIdentityStrength).toBe(originalSite.culturalIdentityStrength)
    }
  })

  it('World → array → JSON → parse → World preserves realm prestige and ideology', () => {
    const original = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')

    const reparsed = M1DataSchemaV7.parse(JSON.parse(JSON.stringify(loadM1Data())))
    const reloaded = createWorldFromM1Data(reparsed, 42, 'realm_qin')

    for (const [id, originalRealm] of original.realms) {
      const reloadedRealm = reloaded.realms.get(id)!
      expect(reloadedRealm.prestige).toBe(originalRealm.prestige)
      expect(reloadedRealm.ideologyLean).toEqual(originalRealm.ideologyLean)
      expect(reloadedRealm.warVictoriesThisYear).toBe(originalRealm.warVictoriesThisYear)
    }
  })
})

describe('M6 persistence: V5 raw → V6 migration determinism', () => {
  it('migrating raw V5 scenario.json yields identical V6 data on every call', () => {
    const v6a = migrateScenarioV5ToV6(scenarioRaw)
    const v6b = migrateScenarioV5ToV6(scenarioRaw)
    expect(v6a).toEqual(v6b)
  })

  it('migrated V6 data is schema-valid', () => {
    const v6 = migrateScenarioV5ToV6(scenarioRaw)
    expect(() => M1DataSchemaV6.parse(v6)).not.toThrow()
  })
})
