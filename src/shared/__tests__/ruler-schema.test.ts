import { describe, it, expect } from 'vitest'
import {
  PersonalityArchetypeSchema,
  RealmSchema,
  RulerStateSchema,
} from '../schemas'

const validRuler = {
  realmId: 'realm_qin',
  generalId: 'gen_zhao_xiang',
  age: 45,
  lifespan: 70,
  health: 80,
  personality: 'conqueror' as const,
  personalityDims: {
    expansionDrive: 0.9,
    diplomaticTrust: 0.2,
    caution: 0.4,
    honor: 0.7,
    vindictiveness: 0.6,
    reformInclination: 0.3,
    patience: 0.5,
    preferredStrategy: 'blitz' as const,
  },
  successionLawId: 'primogeniture' as const,
}

const baseRealm = {
  id: 'realm_qin',
  displayName: 'Qin',
  fullTitle: 'State of Qin',
  color: '#dc2626',
  capital: 'site_xianyang',
  initialSites: ['site_xianyang'],
  initialArmies: [],
  aiPersonality: 'aggressive' as const,
  economy: { treasury: 1000, foodStores: 500, taxRate: 10 },
}

describe('RulerStateSchema (M5)', () => {
  it('accepts a valid RulerState', () => {
    const result = RulerStateSchema.safeParse(validRuler)
    expect(result.success).toBe(true)
  })

  it('rejects RulerState with invalid personality', () => {
    const result = RulerStateSchema.safeParse({ ...validRuler, personality: 'wizard' })
    expect(result.success).toBe(false)
  })

  it('rejects RulerState with invalid personalityDims', () => {
    const result = RulerStateSchema.safeParse({
      ...validRuler,
      personalityDims: { ...validRuler.personalityDims, preferredStrategy: 'ambush' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects RulerState with successionLawId other than primogeniture', () => {
    const result = RulerStateSchema.safeParse({ ...validRuler, successionLawId: 'election' })
    expect(result.success).toBe(false)
  })

  it('rejects RulerState with health out of 0..100 range', () => {
    const result = RulerStateSchema.safeParse({ ...validRuler, health: 150 })
    expect(result.success).toBe(false)
  })

  it('rejects RulerState missing required fields', () => {
    const { age: _age, ...withoutAge } = validRuler
    const result = RulerStateSchema.safeParse(withoutAge)
    expect(result.success).toBe(false)
  })

  it('accepts every PersonalityArchetype enum member', () => {
    const all = ['conqueror', 'steward', 'schemer', 'learned', 'tyrant', 'incompetent', 'benevolent', 'builder']
    for (const p of all) {
      expect(PersonalityArchetypeSchema.safeParse(p).success).toBe(true)
    }
    expect(all).toHaveLength(8)
  })
})

describe('RealmSchema with rulerId (M5)', () => {
  it('accepts a Realm with rulerId set to a generalId string', () => {
    const result = RealmSchema.safeParse({ ...baseRealm, rulerId: 'gen_zhao_xiang' })
    expect(result.success).toBe(true)
  })

  it('accepts a Realm with rulerId set to null', () => {
    const result = RealmSchema.safeParse({ ...baseRealm, rulerId: null })
    expect(result.success).toBe(true)
  })

  it('accepts a Realm without rulerId (optional field)', () => {
    const result = RealmSchema.safeParse(baseRealm)
    expect(result.success).toBe(true)
  })
})
