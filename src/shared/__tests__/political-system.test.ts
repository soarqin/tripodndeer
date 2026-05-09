import { describe, it, expect } from 'vitest'
import { PoliticalSystemSchema, RealmSchema } from '../schemas'
import type { PoliticalSystem } from '../types'

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

describe('PoliticalSystemSchema', () => {
  it('accepts every valid PoliticalSystem value', () => {
    const systems: PoliticalSystem[] = ['enfeoffment', 'commandery', 'legalist_centralized']
    for (const sys of systems) {
      expect(PoliticalSystemSchema.safeParse(sys).success).toBe(true)
    }
  })

  it('rejects unknown PoliticalSystem values', () => {
    expect(PoliticalSystemSchema.safeParse('monarchy').success).toBe(false)
    expect(PoliticalSystemSchema.safeParse('').success).toBe(false)
  })
})

describe('Realm.politicalSystem', () => {
  it('defaults to enfeoffment when politicalSystem is omitted', () => {
    const result = RealmSchema.parse(baseRealm)
    expect(result.politicalSystem).toBe('enfeoffment')
  })

  it('preserves a politicalSystem set explicitly to commandery', () => {
    const result = RealmSchema.parse({ ...baseRealm, politicalSystem: 'commandery' })
    expect(result.politicalSystem).toBe('commandery')
  })

  it('preserves a politicalSystem set to legalist_centralized', () => {
    const result = RealmSchema.parse({ ...baseRealm, politicalSystem: 'legalist_centralized' })
    expect(result.politicalSystem).toBe('legalist_centralized')
  })

  it('rejects an invalid politicalSystem value', () => {
    const result = RealmSchema.safeParse({ ...baseRealm, politicalSystem: 'monarchy' })
    expect(result.success).toBe(false)
  })
})
