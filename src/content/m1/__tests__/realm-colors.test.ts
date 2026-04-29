import { describe, it, expect } from 'vitest'
import scenarioJson from '../scenario.json'

interface RealmShape {
  id: string
  displayName: string
  fullTitle: string
  color: string
  capital: string
}

describe('M1 realm colors', () => {
  const realmMap = new Map<string, RealmShape>(
    (scenarioJson.realms as RealmShape[]).map((r) => [r.id, r]),
  )

  it('realm_qin has 玄黑 color', () => {
    expect(realmMap.get('realm_qin')?.color).toBe('#1A1A1A')
  })
  it('realm_chu has 暗赤 color', () => {
    expect(realmMap.get('realm_chu')?.color).toBe('#8B1A1A')
  })
  it('realm_qi has 青蓝 color', () => {
    expect(realmMap.get('realm_qi')?.color).toBe('#2E5A6E')
  })
  it('realm_yan has 灰白 color', () => {
    expect(realmMap.get('realm_yan')?.color).toBe('#B0B0B0')
  })
  it('realm_han has 橘黄 color', () => {
    expect(realmMap.get('realm_han')?.color).toBe('#D8741A')
  })
  it('realm_zhao has 紫青 color', () => {
    expect(realmMap.get('realm_zhao')?.color).toBe('#5B3A6F')
  })
  it('realm_wei has 翠绿 color', () => {
    expect(realmMap.get('realm_wei')?.color).toBe('#4A8B5C')
  })
  it('realm_zhou has 朱赤 color', () => {
    expect(realmMap.get('realm_zhou')?.color).toBe('#C8362F')
  })

  it('every realm has a non-empty displayName and fullTitle', () => {
    for (const realm of scenarioJson.realms as RealmShape[]) {
      expect(realm.displayName.length).toBeGreaterThan(0)
      expect(realm.fullTitle.length).toBeGreaterThan(0)
    }
  })

  it('every realm capital references an existing site', () => {
    const siteIds = new Set(
      (scenarioJson.sites as { id: string }[]).map((s) => s.id),
    )
    for (const realm of scenarioJson.realms as RealmShape[]) {
      expect(siteIds.has(realm.capital)).toBe(true)
    }
  })
})
