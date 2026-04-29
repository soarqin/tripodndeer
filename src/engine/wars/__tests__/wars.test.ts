import { describe, expect, it } from 'vitest'
import { warKey, isAtWar, declareWar } from '../index'

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
})

describe('declareWar', () => {
  it('is idempotent - declaring twice keeps size 1', () => {
    const wars1 = declareWar(new Map(), 'realm_qin', 'realm_han')
    const wars2 = declareWar(wars1, 'realm_qin', 'realm_han')
    expect(wars2.size).toBe(1)
  })

  it('does not mutate the input map', () => {
    const original = new Map<string, true>()
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
