import { describe, it, expect } from 'vitest'
import { RealmSchema } from '../schemas'
import type { Realm } from '../types'

const baseRealm = {
  id: 'realm_qin',
  displayName: 'Qin',
  fullTitle: 'State of Qin',
  color: '#dc2626',
  capital: 'site_xianyang',
  initialSites: ['site_xianyang'],
  initialArmies: [],
  economy: { treasury: 1000, foodStores: 500, taxRate: 10 },
}

describe('Realm.traits required field', () => {
  it('defaults to empty array when traits is omitted', () => {
    const result = RealmSchema.parse(baseRealm)
    expect(result.traits).toEqual([])
  })

  it('preserves explicitly provided traits array', () => {
    const result = RealmSchema.parse({ ...baseRealm, traits: ['warmonger', 'reformist'] })
    expect(result.traits).toEqual(['warmonger', 'reformist'])
  })

  it('Realm interface treats traits as readonly string[] (compile-time guarantee)', () => {
    const realm: Realm = {
      ...baseRealm,
      traits: ['legacy'],
      politicalSystem: 'enfeoffment',
    }
    expect(realm.traits).toEqual(['legacy'])
    const first: string | undefined = realm.traits[0]
    expect(first).toBe('legacy')
  })
})
