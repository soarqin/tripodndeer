import { describe, it, expect } from 'vitest'
import {
  AmbitionSchema,
  FactionIdSchema,
  GeneralAttrsSchema,
  GeneralSchema,
  LoyaltyStateSchema,
  PostSchema,
  SpecialtySchema,
} from '../schemas'

const baseLegacy = {
  id: 'gen_1',
  realmId: 'realm_qin',
  name: 'Bai Qi',
  might: 18,
  command: 16,
  loyalty: 80,
}

const fullM5 = {
  ...baseLegacy,
  attrs: { wu: 18, zheng: 8, jiao: 6, mou: 14, xue: 10, po: 12 },
  specialty: 'warrior' as const,
  ambition: 'high' as const,
  faction: 'military_meritocracy' as const,
  age: 42,
  posts: ['general'] as const,
  loyaltyState: 'loyal' as const,
}

describe('GeneralSchema (M5)', () => {
  it('accepts a General with all new M5 fields populated', () => {
    const result = GeneralSchema.safeParse(fullM5)
    expect(result.success).toBe(true)
  })

  it('accepts a General with only legacy fields (M5 fields optional)', () => {
    const result = GeneralSchema.safeParse(baseLegacy)
    expect(result.success).toBe(true)
  })

  it('rejects a General with an unknown specialty', () => {
    const result = GeneralSchema.safeParse({ ...fullM5, specialty: 'wizard' })
    expect(result.success).toBe(false)
  })

  it('rejects a General with an unknown ambition value', () => {
    const result = GeneralSchema.safeParse({ ...fullM5, ambition: 'extreme' })
    expect(result.success).toBe(false)
  })

  it('rejects a General with an unknown faction id', () => {
    const result = GeneralSchema.safeParse({ ...fullM5, faction: 'merchants' })
    expect(result.success).toBe(false)
  })

  it('rejects a General with an unknown loyaltyState', () => {
    const result = GeneralSchema.safeParse({ ...fullM5, loyaltyState: 'plotting' })
    expect(result.success).toBe(false)
  })

  it('rejects attrs with values outside 0..20 range', () => {
    const result = GeneralSchema.safeParse({
      ...fullM5,
      attrs: { ...fullM5.attrs, wu: 25 },
    })
    expect(result.success).toBe(false)
  })

  it('rejects attrs missing one of the six dimensions', () => {
    const partial = { wu: 10, zheng: 10, jiao: 10, mou: 10, xue: 10 }
    const result = GeneralAttrsSchema.safeParse(partial)
    expect(result.success).toBe(false)
  })

  it('rejects a post outside the allowed enum', () => {
    const result = GeneralSchema.safeParse({ ...fullM5, posts: ['emperor'] })
    expect(result.success).toBe(false)
  })

  it('keeps legacy fields required (might / command / loyalty)', () => {
    const { might: _m, ...withoutMight } = baseLegacy
    const r1 = GeneralSchema.safeParse(withoutMight)
    expect(r1.success).toBe(false)

    const { command: _c, ...withoutCommand } = baseLegacy
    const r2 = GeneralSchema.safeParse(withoutCommand)
    expect(r2.success).toBe(false)

    const { loyalty: _l, ...withoutLoyalty } = baseLegacy
    const r3 = GeneralSchema.safeParse(withoutLoyalty)
    expect(r3.success).toBe(false)
  })

  it('accepts every Specialty enum member', () => {
    const all = ['commander', 'warrior', 'strategist', 'administrator', 'reformer', 'diplomat', 'spy', 'scholar', 'engineer']
    for (const s of all) {
      expect(SpecialtySchema.safeParse(s).success).toBe(true)
    }
    expect(all).toHaveLength(9)
  })

  it('accepts every Ambition enum member', () => {
    const all = ['low', 'mid', 'high']
    for (const a of all) {
      expect(AmbitionSchema.safeParse(a).success).toBe(true)
    }
    expect(all).toHaveLength(3)
  })

  it('accepts every LoyaltyState enum member', () => {
    const all = ['loyal', 'shirking', 'seeking_departure', 'secret_contact', 'defected']
    for (const s of all) {
      expect(LoyaltyStateSchema.safeParse(s).success).toBe(true)
    }
    expect(all).toHaveLength(5)
  })

  it('accepts every FactionId enum member', () => {
    const all = ['royal_kin', 'noble_clans', 'military_meritocracy', 'reformists', 'conservatives', 'foreign_clients']
    for (const f of all) {
      expect(FactionIdSchema.safeParse(f).success).toBe(true)
    }
    expect(all).toHaveLength(6)
  })

  it('accepts every Post enum member', () => {
    const all = ['ruler', 'chancellor', 'general', 'governor']
    for (const p of all) {
      expect(PostSchema.safeParse(p).success).toBe(true)
    }
    expect(all).toHaveLength(4)
  })
})
