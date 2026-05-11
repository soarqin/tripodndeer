import { describe, expect, it } from 'vitest'
import { HINTS } from '../hints'

describe('hint IDs uniqueness', () => {
  it('has exactly 10 hint entries', () => {
    expect(HINTS.length).toBe(10)
  })

  it('all hint IDs are unique', () => {
    const ids = HINTS.map(h => h.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('all entries have required fields', () => {
    for (const hint of HINTS) {
      expect(typeof hint.id).toBe('string')
      expect(hint.id.length).toBeGreaterThan(0)
      expect(typeof hint.title).toBe('string')
      expect(hint.title.length).toBeGreaterThan(0)
      expect(typeof hint.body).toBe('string')
      expect(hint.body.length).toBeGreaterThan(0)
      expect(typeof hint.codexEntryId).toBe('string')
      expect(hint.codexEntryId.length).toBeGreaterThan(0)
    }
  })

  it('no hint has a version field', () => {
    for (const hint of HINTS) {
      expect('version' in hint).toBe(false)
    }
  })
})
