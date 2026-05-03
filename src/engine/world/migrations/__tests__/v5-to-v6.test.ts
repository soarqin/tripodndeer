import scenarioV1 from '@/content/m1/scenario.json'
import { describe, expect, it } from 'vitest'
import { migrateScenarioV3ToV4 } from '../v3-to-v4'
import { migrateScenarioV4ToV5 } from '../v4-to-v5'
import { migrateScenarioV5ToV6 } from '../v5-to-v6'
import m5SaveV3 from './fixtures/m5-save-v3.json'

describe('migrateScenarioV5ToV6 — schema_version', () => {
  it('sets schema_version to 6', () => {
    const v5 = migrateScenarioV4ToV5(migrateScenarioV3ToV4(m5SaveV3))
    const v6 = migrateScenarioV5ToV6(v5)
    expect(v6.schema_version).toBe(6)
  })
})

describe('migrateScenarioV5ToV6 — academies', () => {
  it('initializes 2 default academies (jixia + xihe)', () => {
    const v5 = migrateScenarioV4ToV5(migrateScenarioV3ToV4(m5SaveV3))
    const v6 = migrateScenarioV5ToV6(v5)

    expect(v6.academies).toHaveLength(2)
    expect(v6.academies.map(a => a.id).sort()).toEqual(['jixia', 'xihe'])
  })

  it('jixia academy is hosted by Qi at site_005 with ru/dao ideology', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    const jixia = v6.academies.find(a => a.id === 'jixia')!

    expect(jixia.hostRealmId).toBe('realm_qi')
    expect(jixia.hostSiteId).toBe('site_005')
    expect(jixia.primaryIdeology).toBe('ru')
    expect(jixia.secondaryIdeology).toBe('dao')
    expect(jixia.founded).toBe(318)
    expect(jixia.level).toBe(1)
    expect(jixia.status).toBe('active')
  })

  it('xihe academy is hosted by Wei at site_032 with fa/bing ideology', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    const xihe = v6.academies.find(a => a.id === 'xihe')!

    expect(xihe.hostRealmId).toBe('realm_wei')
    expect(xihe.hostSiteId).toBe('site_032')
    expect(xihe.primaryIdeology).toBe('fa')
    expect(xihe.secondaryIdeology).toBe('bing')
    expect(xihe.founded).toBe(419)
    expect(xihe.level).toBe(1)
    expect(xihe.status).toBe('active')
  })
})

describe('migrateScenarioV5ToV6 — site cultural fields', () => {
  it('derives cultural tag from initialOwnership', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    const linzi = v6.sites.find(s => s.id === 'site_005')!
    const xianyang = v6.sites.find(s => s.id === 'site_001')!

    expect(linzi.cultural).toBe('chinese_qi')
    expect(xianyang.cultural).toBe('chinese_qin')
  })

  it('initializes culturalIdentityStrength to 100', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    expect(v6.sites.every(s => s.culturalIdentityStrength === 100)).toBe(true)
  })

  it('initializes lastConquestTick and lowIdentitySinceTick to null', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    expect(v6.sites.every(s => s.lastConquestTick === null)).toBe(true)
    expect(v6.sites.every(s => s.lowIdentitySinceTick === null)).toBe(true)
  })

  it('falls back to di_xirong for sites with no owner', () => {
    const v5 = migrateScenarioV4ToV5(migrateScenarioV3ToV4(m5SaveV3))
    const dataNoOwnership = { ...v5, initialOwnership: {} }
    const v6 = migrateScenarioV5ToV6(dataNoOwnership)

    expect(v6.sites.every(s => s.cultural === 'di_xirong')).toBe(true)
  })
})

describe('migrateScenarioV5ToV6 — realm prestige and ideology', () => {
  it('Zhou gets prestige 90', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    const zhou = v6.realms.find(r => r.id === 'realm_zhou')!
    expect(zhou.prestige).toBe(90)
  })

  it('Qin/Chu/Qi get prestige 70', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    expect(v6.realms.find(r => r.id === 'realm_qin')!.prestige).toBe(70)
    expect(v6.realms.find(r => r.id === 'realm_chu')!.prestige).toBe(70)
    expect(v6.realms.find(r => r.id === 'realm_qi')!.prestige).toBe(70)
  })

  it('Yan/Zhao/Wei/Han get prestige 55', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    expect(v6.realms.find(r => r.id === 'realm_yan')!.prestige).toBe(55)
    expect(v6.realms.find(r => r.id === 'realm_zhao')!.prestige).toBe(55)
    expect(v6.realms.find(r => r.id === 'realm_wei')!.prestige).toBe(55)
    expect(v6.realms.find(r => r.id === 'realm_han')!.prestige).toBe(55)
  })

  it('initializes ideologyLean to all zeros', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    for (const realm of v6.realms) {
      expect(realm.ideologyLean).toEqual({ fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 })
    }
  })

  it('initializes warVictoriesThisYear to 0', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    expect(v6.realms.every(r => r.warVictoriesThisYear === 0)).toBe(true)
  })
})

describe('migrateScenarioV5ToV6 — determinism', () => {
  it('is deterministic (same input → same output)', () => {
    const result1 = migrateScenarioV5ToV6(scenarioV1)
    const result2 = migrateScenarioV5ToV6(scenarioV1)
    expect(result1).toEqual(result2)
  })

  it('chains v3→v4→v5→v6 when input is v3', () => {
    const v6 = migrateScenarioV5ToV6(m5SaveV3)

    expect(v6.schema_version).toBe(6)
    expect(v6.academies).toHaveLength(2)
  })

  it('chains v1→v2→v3→v4→v5→v6 when raw data has no schema_version', () => {
    const v1Like = { ...scenarioV1 } as Record<string, unknown>
    delete v1Like.schema_version

    const v6 = migrateScenarioV5ToV6(v1Like)

    expect(v6.schema_version).toBe(6)
    expect(v6.academies).toHaveLength(2)
    expect(v6.realms.find(r => r.id === 'realm_zhou')?.prestige).toBe(90)
  })
})

describe('migrateScenarioV5ToV6 — preserves V5 fields', () => {
  it('preserves generals', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    expect(v6.generals.length).toBeGreaterThan(0)
  })

  it('preserves passes and adjacencyEdges', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    expect(v6.passes.length).toBe(5)
    expect(v6.adjacencyEdges.length).toBe(5)
  })

  it('preserves disasterStates / tradeRoutes / factionInfluences as empty arrays', () => {
    const v5 = migrateScenarioV4ToV5(migrateScenarioV3ToV4(m5SaveV3))
    const v6 = migrateScenarioV5ToV6(v5)

    expect(v6.disasterStates).toEqual([])
    expect(v6.tradeRoutes).toEqual([])
    expect(v6.factionInfluences).toEqual([])
  })

  it('preserves all 50 sites from M1 scenario', () => {
    const v6 = migrateScenarioV5ToV6(scenarioV1)
    expect(v6.sites).toHaveLength(50)
  })
})
