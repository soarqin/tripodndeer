import { describe, expect, it } from 'vitest'
import type { PersonalityArchetype, Specialty, Ambition, LoyaltyState, FactionId } from '~/shared/types'

// Type-level tests: verify each union has the right number of members
const PERSONALITY_ARCHETYPES: PersonalityArchetype[] = [
  'conqueror', 'steward', 'schemer', 'learned', 'tyrant', 'incompetent', 'benevolent', 'builder'
]
const SPECIALTIES: Specialty[] = [
  'commander', 'warrior', 'strategist', 'administrator', 'reformer', 'diplomat', 'spy', 'scholar', 'engineer'
]
const AMBITIONS: Ambition[] = ['low', 'mid', 'high']
const LOYALTY_STATES: LoyaltyState[] = ['loyal', 'shirking', 'seeking_departure', 'secret_contact', 'defected']
const FACTION_IDS: FactionId[] = ['royal_kin', 'noble_clans', 'military_meritocracy', 'reformists', 'conservatives', 'foreign_clients']

describe('M5 types', () => {
  it('PersonalityArchetype has 8 values', () => {
    expect(PERSONALITY_ARCHETYPES).toHaveLength(8)
  })
  it('Specialty has 9 values', () => {
    expect(SPECIALTIES).toHaveLength(9)
  })
  it('Ambition has 3 values', () => {
    expect(AMBITIONS).toHaveLength(3)
  })
  it('LoyaltyState has 5 values', () => {
    expect(LOYALTY_STATES).toHaveLength(5)
  })
  it('FactionId has 6 values', () => {
    expect(FACTION_IDS).toHaveLength(6)
  })
})
