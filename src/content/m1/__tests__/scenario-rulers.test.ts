import { describe, it, expect } from 'vitest'
import scenarioJson from '../scenario.json'
import namePool from '~/content/m5/name-pool.json'

interface RealmShape {
  id: string
  rulerId?: string | null
}

interface GeneralAttrs {
  wu: number
  zheng: number
  jiao: number
  mou: number
  xue: number
  po: number
}

interface GeneralShape {
  id: string
  realmId: string
  name: string
  might: number
  command: number
  loyalty: number
  attrs?: GeneralAttrs
  specialty?: string
  ambition?: string
  age?: number
  posts?: readonly string[]
  loyaltyState?: string
}

describe('scenario rulers and historical characters', () => {
  const realms = scenarioJson.realms as RealmShape[]
  const generals = scenarioJson.generals as GeneralShape[]
  const generalIds = new Set(generals.map((g) => g.id))

  it('each of 7 realms has a non-null rulerId', () => {
    const sevenRealmIds = ['realm_qin', 'realm_zhao', 'realm_wei', 'realm_han', 'realm_chu', 'realm_qi', 'realm_yan']
    for (const realmId of sevenRealmIds) {
      const realm = realms.find((r) => r.id === realmId)
      expect(realm, `${realmId} should exist`).toBeDefined()
      expect(realm!.rulerId, `${realmId} should have non-null rulerId`).toBeTruthy()
      expect(typeof realm!.rulerId).toBe('string')
    }
  })

  it('each rulerId points to an existing general in the scenario', () => {
    const sevenRealmIds = ['realm_qin', 'realm_zhao', 'realm_wei', 'realm_han', 'realm_chu', 'realm_qi', 'realm_yan']
    for (const realmId of sevenRealmIds) {
      const realm = realms.find((r) => r.id === realmId)
      expect(realm!.rulerId).toBeDefined()
      expect(generalIds.has(realm!.rulerId as string), `general ${realm!.rulerId} should exist for ${realmId}`).toBe(true)
    }
  })

  it('rulerId of each ruler-general matches its realmId', () => {
    const sevenRealmIds = ['realm_qin', 'realm_zhao', 'realm_wei', 'realm_han', 'realm_chu', 'realm_qi', 'realm_yan']
    for (const realmId of sevenRealmIds) {
      const realm = realms.find((r) => r.id === realmId)
      const ruler = generals.find((g) => g.id === realm!.rulerId)
      expect(ruler).toBeDefined()
      expect(ruler!.realmId).toBe(realmId)
    }
  })

  it('at least 10 historical characters have complete attrs', () => {
    const charactersWithAttrs = generals.filter((g) => {
      if (!g.attrs) return false
      const a = g.attrs
      return (
        typeof a.wu === 'number' &&
        typeof a.zheng === 'number' &&
        typeof a.jiao === 'number' &&
        typeof a.mou === 'number' &&
        typeof a.xue === 'number' &&
        typeof a.po === 'number'
      )
    })
    expect(charactersWithAttrs.length).toBeGreaterThanOrEqual(10)
  })

  it('attrs values are within valid range (0-20)', () => {
    for (const g of generals) {
      if (!g.attrs) continue
      const a = g.attrs
      for (const key of ['wu', 'zheng', 'jiao', 'mou', 'xue', 'po'] as const) {
        expect(a[key]).toBeGreaterThanOrEqual(0)
        expect(a[key]).toBeLessThanOrEqual(20)
      }
    }
  })

  it('name-pool.json has at least 60 unique names', () => {
    expect(namePool.names.length).toBeGreaterThanOrEqual(60)
    const unique = new Set(namePool.names)
    expect(unique.size).toBe(namePool.names.length)
  })

  it('all generals have loyaltyState field', () => {
    for (const g of generals) {
      expect(g.loyaltyState, `${g.id} missing loyaltyState`).toBeDefined()
      expect(typeof g.loyaltyState).toBe('string')
    }
  })

  it('contains key historical characters: 蔺相如, 范雎, 廉颇, 白起', () => {
    const names = new Set(generals.map((g) => g.name))
    expect(names.has('蔺相如')).toBe(true)
    expect(names.has('范雎')).toBe(true)
    expect(names.has('廉颇')).toBe(true)
    expect(names.has('白起')).toBe(true)
  })

  it('all 7 ruler-generals have posts including ruler', () => {
    const sevenRealmIds = ['realm_qin', 'realm_zhao', 'realm_wei', 'realm_han', 'realm_chu', 'realm_qi', 'realm_yan']
    for (const realmId of sevenRealmIds) {
      const realm = realms.find((r) => r.id === realmId)
      const ruler = generals.find((g) => g.id === realm!.rulerId)
      expect(ruler!.posts, `ruler of ${realmId} should have posts`).toBeDefined()
      expect(ruler!.posts).toContain('ruler')
    }
  })
})
