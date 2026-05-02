import { describe, it, expect } from 'vitest'
import { FactionImbalanceEventSchema } from '~/shared/schemas'
import royalKin from '../factions/royal-kin.json'
import nobleClans from '../factions/noble-clans.json'
import militaryMeritocracy from '../factions/military-meritocracy.json'
import reformists from '../factions/reformists.json'
import conservatives from '../factions/conservatives.json'
import foreignClients from '../factions/foreign-clients.json'
import coup from '../imbalance-events/coup.json'
import split from '../imbalance-events/split.json'
import overthrow from '../imbalance-events/overthrow.json'

const allFactions = [royalKin, nobleClans, militaryMeritocracy, reformists, conservatives, foreignClients]
const allImbalanceEvents = [coup, split, overthrow]

describe('faction metadata JSONs', () => {
  it('loads exactly 6 factions', () => {
    expect(allFactions.length).toBe(6)
  })
  
  it('all 6 faction IDs are correct', () => {
    const expectedIds = new Set([
      'royal_kin', 'noble_clans', 'military_meritocracy',
      'reformists', 'conservatives', 'foreign_clients'
    ])
    for (const f of allFactions) {
      expect(expectedIds.has(f.id)).toBe(true)
    }
  })
  
  it('all factions have non-empty taglineZh under 50 chars', () => {
    for (const f of allFactions) {
      expect(f.taglineZh.length).toBeGreaterThan(0)
      expect(f.taglineZh.length).toBeLessThanOrEqual(50)
    }
  })
  
  it('all 6 faction IDs are unique', () => {
    const ids = allFactions.map(f => f.id)
    expect(new Set(ids).size).toBe(6)
  })
})

describe('imbalance event JSONs', () => {
  it('loads exactly 3 imbalance events', () => {
    expect(allImbalanceEvents.length).toBe(3)
  })
  
  it('all 3 pass FactionImbalanceEventSchema', () => {
    for (const e of allImbalanceEvents) {
      expect(() => FactionImbalanceEventSchema.parse(e)).not.toThrow()
    }
  })
  
  it('3 imbalance event kinds are unique', () => {
    const kinds = allImbalanceEvents.map(e => e.kind)
    expect(new Set(kinds).size).toBe(3)
    expect(new Set(kinds)).toContain('coup')
    expect(new Set(kinds)).toContain('split')
    expect(new Set(kinds)).toContain('overthrow')
  })
})
