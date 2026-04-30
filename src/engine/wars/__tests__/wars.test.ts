import { describe, expect, it } from 'vitest'
import type { GameDate, WarKey, WarState } from '~/shared/types'
import {
  attachPeaceProposal,
  declareWar,
  declareWarWithCasus,
  endWar,
  getWarState,
  isAtWar,
  warKey,
} from '../index'

const sampleDate: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }

describe('warKey', () => {
  it('is symmetric - warKey(a,b) === warKey(b,a)', () => {
    expect(warKey('realm_qin', 'realm_han')).toBe(warKey('realm_han', 'realm_qin'))
  })

  it('throws when a === b', () => {
    expect(() => warKey('realm_qin', 'realm_qin')).toThrow()
  })

  it('produces a deterministic key', () => {
    expect(warKey('realm_qin', 'realm_han')).toBe('realm_han:realm_qin')
  })
})

describe('isAtWar', () => {
  it('returns false for empty wars', () => {
    expect(isAtWar(new Map(), 'realm_qin', 'realm_han')).toBe(false)
  })

  it('returns false when same realm', () => {
    expect(isAtWar(new Map(), 'realm_qin', 'realm_qin')).toBe(false)
  })

  it('returns true after declareWar', () => {
    const wars = declareWar(new Map(), 'realm_qin', 'realm_han')
    expect(isAtWar(wars, 'realm_qin', 'realm_han')).toBe(true)
    expect(isAtWar(wars, 'realm_han', 'realm_qin')).toBe(true)
  })

  it('remains symmetric with the new WarState map type', () => {
    const wars = declareWarWithCasus(new Map(), 'realm_qin', 'realm_han', 'cb_border', sampleDate)
    expect(isAtWar(wars, 'realm_qin', 'realm_han')).toBe(isAtWar(wars, 'realm_han', 'realm_qin'))
  })
})

describe('declareWar', () => {
  it('is idempotent - declaring twice keeps size 1', () => {
    const wars1 = declareWar(new Map(), 'realm_qin', 'realm_han')
    const wars2 = declareWar(wars1, 'realm_qin', 'realm_han')
    expect(wars2.size).toBe(1)
  })

  it('does not mutate the input map', () => {
    const original = new Map<WarKey, WarState>()
    declareWar(original, 'realm_qin', 'realm_han')
    expect(original.size).toBe(0)
  })

  it('multiple wars are independent', () => {
    const wars1 = declareWar(new Map(), 'realm_qin', 'realm_han')
    const wars2 = declareWar(wars1, 'realm_qin', 'realm_zhao')
    expect(wars2.size).toBe(2)
    expect(isAtWar(wars2, 'realm_qin', 'realm_han')).toBe(true)
    expect(isAtWar(wars2, 'realm_qin', 'realm_zhao')).toBe(true)
    expect(isAtWar(wars2, 'realm_han', 'realm_zhao')).toBe(false)
  })

  it('returns the same map when declaring an existing war', () => {
    const wars1 = declareWar(new Map(), 'realm_qin', 'realm_han')
    const wars2 = declareWar(wars1, 'realm_han', 'realm_qin')
    expect(wars2).toBe(wars1)
  })
})

describe('getWarState', () => {
  it('returns null for an unknown war pair', () => {
    expect(getWarState(new Map(), 'realm_qin', 'realm_han')).toBeNull()
  })

  it('returns the WarState for a declared war', () => {
    const wars = declareWarWithCasus(new Map(), 'realm_qin', 'realm_han', 'cb_border', sampleDate)
    const state = getWarState(wars, 'realm_qin', 'realm_han')
    expect(state).not.toBeNull()
    expect(state?.casusBelli).toBe('cb_border')
    expect(state?.declaredAt).toEqual(sampleDate)
    expect(state?.peaceProposalId).toBeNull()
    expect(state?.occupiedSites.size).toBe(0)
  })
})

describe('declareWarWithCasus', () => {
  it('creates a war with the given casusBelli and date', () => {
    const wars = declareWarWithCasus(new Map(), 'realm_qin', 'realm_han', 'cb_succession', sampleDate)
    const state = wars.get(warKey('realm_qin', 'realm_han'))
    expect(state?.casusBelli).toBe('cb_succession')
    expect(state?.declaredAt).toEqual(sampleDate)
  })

  it('is idempotent for an existing war', () => {
    const wars1 = declareWarWithCasus(new Map(), 'realm_qin', 'realm_han', 'cb_a', sampleDate)
    const wars2 = declareWarWithCasus(wars1, 'realm_qin', 'realm_han', 'cb_b', sampleDate)
    expect(wars2).toBe(wars1)
  })

  it('accepts a null casusBelli', () => {
    const wars = declareWarWithCasus(new Map(), 'realm_qin', 'realm_han', null, sampleDate)
    expect(wars.get(warKey('realm_qin', 'realm_han'))?.casusBelli).toBeNull()
  })
})

describe('endWar', () => {
  it('removes the war from the map', () => {
    const wars1 = declareWar(new Map(), 'realm_qin', 'realm_han')
    const key = warKey('realm_qin', 'realm_han')
    const wars2 = endWar(wars1, key)
    expect(wars2.size).toBe(0)
    expect(isAtWar(wars2, 'realm_qin', 'realm_han')).toBe(false)
  })

  it('returns the same map when the key is not present', () => {
    const wars1 = declareWar(new Map(), 'realm_qin', 'realm_han')
    const wars2 = endWar(wars1, warKey('realm_qin', 'realm_zhao'))
    expect(wars2).toBe(wars1)
  })

  it('does not mutate the input map', () => {
    const wars1 = declareWar(new Map(), 'realm_qin', 'realm_han')
    const before = wars1.size
    endWar(wars1, warKey('realm_qin', 'realm_han'))
    expect(wars1.size).toBe(before)
  })
})

describe('attachPeaceProposal', () => {
  it('updates the peaceProposalId on the WarState', () => {
    const wars1 = declareWar(new Map(), 'realm_qin', 'realm_han')
    const key = warKey('realm_qin', 'realm_han')
    const wars2 = attachPeaceProposal(wars1, key, 'pp_001')
    expect(wars2.get(key)?.peaceProposalId).toBe('pp_001')
  })

  it('throws when the war key is missing', () => {
    expect(() => attachPeaceProposal(new Map(), warKey('realm_qin', 'realm_han'), 'pp_001')).toThrow()
  })

  it('does not mutate the input map', () => {
    const wars1 = declareWar(new Map(), 'realm_qin', 'realm_han')
    const key = warKey('realm_qin', 'realm_han')
    attachPeaceProposal(wars1, key, 'pp_001')
    expect(wars1.get(key)?.peaceProposalId).toBeNull()
  })
})
