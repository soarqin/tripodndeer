import { describe, expect, it } from 'vitest'
import { RealmSchema } from '../schemas'

const baseRealm = {
  id: 'realm_qin',
  displayName: 'Qin',
  fullTitle: 'State of Qin',
  color: '#dc2626',
  capital: 'site_xianyang',
  initialSites: ['site_xianyang'],
  initialArmies: [],
}

describe('RealmSchema without aiPersonality', () => {
  it('accepts a realm without aiPersonality', () => {
    expect(() => RealmSchema.parse(baseRealm)).not.toThrow()
  })

  it('rejects a realm with aiPersonality', () => {
    expect(() =>
      RealmSchema.parse({
        ...baseRealm,
        aiPersonality: 'aggressive',
      }),
    ).toThrow()
  })
})
