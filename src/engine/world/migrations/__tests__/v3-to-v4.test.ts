import scenarioV1 from '@/content/m1/scenario.json'
import { describe, expect, it } from 'vitest'
import { migrateScenarioV3ToV4 } from '../v3-to-v4'
import m5SaveV3 from './fixtures/m5-save-v3.json'

describe('migrateScenarioV3ToV4 — schema_version', () => {
  it('sets schema_version to 4', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    expect(v4.schema_version).toBe(4)
  })
})

describe('migrateScenarioV3ToV4 — realms', () => {
  it('preserves existing traits when present', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const realm = v4.realms.find(r => r.id === 'realm_with_traits')!

    expect(realm.traits).toEqual(['legalist', 'qin_legacy'])
  })

  it('realm without traits gets traits=[]', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const realm = v4.realms.find(r => r.id === 'realm_without_traits')!

    expect(realm.traits).toEqual([])
  })

  it('all realms get politicalSystem=enfeoffment when missing', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)

    for (const realm of v4.realms) {
      expect(realm.politicalSystem).toBe('enfeoffment')
    }
  })

  it('preserves explicit politicalSystem when present', () => {
    const data = {
      ...m5SaveV3,
      realms: m5SaveV3.realms.map((r, i) =>
        i === 0 ? { ...r, politicalSystem: 'commandery' } : r,
      ),
    }
    const v4 = migrateScenarioV3ToV4(data)

    expect(v4.realms[0]!.politicalSystem).toBe('commandery')
    expect(v4.realms[1]!.politicalSystem).toBe('enfeoffment')
  })
})

describe('migrateScenarioV3ToV4 — rulers', () => {
  it('rulers get inOfficeSinceTick=0 when missing', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    const ruler = v4.rulers.find(r => r.realmId === 'realm_without_traits')!

    expect(ruler.inOfficeSinceTick).toBe(0)
  })

  it('preserves explicit inOfficeSinceTick when present', () => {
    const data = {
      ...m5SaveV3,
      rulers: m5SaveV3.rulers.map(r => ({ ...r, inOfficeSinceTick: 42 })),
    }
    const v4 = migrateScenarioV3ToV4(data)

    expect(v4.rulers[0]!.inOfficeSinceTick).toBe(42)
  })
})

describe('migrateScenarioV3ToV4 — reformStates', () => {
  it('initializes reformStates as empty array', () => {
    const v4 = migrateScenarioV3ToV4(m5SaveV3)
    expect(v4.reformStates).toEqual([])
  })
})

describe('migrateScenarioV3ToV4 — chain', () => {
  it('chains v1→v2→v3→v4 when raw data has no schema_version', () => {
    const v1Like = { ...scenarioV1 } as Record<string, unknown>
    delete v1Like.schema_version
    v1Like.realms = (scenarioV1.realms as Array<Record<string, unknown>>).map(r => {
      const { traits: _t, politicalSystem: _p, ...rest } = r
      return rest
    })

    const v4 = migrateScenarioV3ToV4(v1Like)

    expect(v4.schema_version).toBe(4)
    expect(Array.isArray(v4.rulers)).toBe(true)
    expect(Array.isArray(v4.eventChainStates)).toBe(true)
    expect(v4.reformStates).toEqual([])
    for (const realm of v4.realms) {
      expect(Array.isArray(realm.traits)).toBe(true)
      expect(realm.politicalSystem).toBe('enfeoffment')
    }
  })

  it('chains v2→v3→v4 when raw data has schema_version=2', () => {
    const v4 = migrateScenarioV3ToV4(scenarioV1)

    expect(v4.schema_version).toBe(4)
    expect(v4.reformStates).toEqual([])
  })
})
