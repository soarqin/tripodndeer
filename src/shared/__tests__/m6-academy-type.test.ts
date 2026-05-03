import { describe, it, expect } from 'vitest'
import type { Academy, ZhouInvestitureState } from '../types'

describe('M6 Academy type', () => {
  it('Academy has 8 required fields', () => {
    const academy: Academy = {
      id: 'jixia',
      hostRealmId: 'realm_qi',
      hostSiteId: 'site_qi_capital',
      primaryIdeology: 'ru',
      secondaryIdeology: 'dao',
      founded: 318,
      level: 1,
      status: 'active',
    }
    expect(academy.id).toBe('jixia')
    expect(academy.level).toBe(1)
    expect(academy.status).toBe('active')
  })

  it('ZhouInvestitureState accepts optional rank', () => {
    const state: ZhouInvestitureState = {
      realmId: 'realm_qin',
      recognizedTitle: 'King',
      grantedAtTick: 100,
      expiresAtTick: null,
      source: 'zhou',
      rank: 'duke',
    }
    expect(state.rank).toBe('duke')
  })

  it('ZhouInvestitureState works without optional fields', () => {
    const state: ZhouInvestitureState = {
      realmId: 'realm_qin',
      recognizedTitle: 'King',
      grantedAtTick: 100,
      expiresAtTick: null,
      source: 'zhou',
    }
    expect(state.rank).toBeUndefined()
    expect(state.lastTributeTick).toBeUndefined()
  })
})
