import { describe, it, expect } from 'vitest'
import * as balance from '../balance'
import {
  M42_DISASTER_COUNT,
  M42_DISASTER_TYPES,
  M42_DISASTER_RELIEF_CHOICES,
  M42_DISASTER_BASE_PROBABILITY_BP,
  M42_FACTION_COUNT,
  M42_FACTION_INFLUENCE_INITIAL,
  M42_FACTION_INFLUENCE_MIN,
  M42_FACTION_INFLUENCE_MAX,
  M42_FACTION_IMBALANCE_THRESHOLD,
  M42_FACTION_EVENT_COOLDOWN_YEARS,
  M42_FACTION_EVENT_PRIORITY,
  M42_TRADE_ROUTE_MAX_PER_REALM,
  M42_TRAIT_DIMENSIONS_COUNT,
  M42_AI_DISASTER_RELIEF_PROPENSITY,
} from '../balance'

const EXPECTED_ARCHETYPES = ['benevolent', 'steward', 'tyrant', 'conqueror', 'incompetent', 'builder', 'learned', 'schemer']

describe('M42_ balance constants', () => {
  it('M42_DISASTER_COUNT === 6', () => {
    expect(M42_DISASTER_COUNT).toBe(6)
  })

  it('M42_DISASTER_TYPES.length === M42_DISASTER_COUNT', () => {
    expect(M42_DISASTER_TYPES.length).toBe(M42_DISASTER_COUNT)
  })

  it('M42_DISASTER_RELIEF_CHOICES has exactly 4 options', () => {
    expect(M42_DISASTER_RELIEF_CHOICES.length).toBe(4)
    expect(M42_DISASTER_RELIEF_CHOICES).toContain('open_granary')
    expect(M42_DISASTER_RELIEF_CHOICES).toContain('reduce_tax')
    expect(M42_DISASTER_RELIEF_CHOICES).toContain('forced_levy')
    expect(M42_DISASTER_RELIEF_CHOICES).toContain('ignore')
  })

  it('M42_DISASTER_BASE_PROBABILITY_BP all positive integers', () => {
    for (const [, bp] of Object.entries(M42_DISASTER_BASE_PROBABILITY_BP)) {
      expect(Number.isInteger(bp)).toBe(true)
      expect(bp).toBeGreaterThan(0)
    }
  })

  it('M42_FACTION_COUNT === 6', () => {
    expect(M42_FACTION_COUNT).toBe(6)
  })

  it('M42_FACTION_INFLUENCE_INITIAL is within [MIN, MAX]', () => {
    expect(M42_FACTION_INFLUENCE_INITIAL).toBeGreaterThanOrEqual(M42_FACTION_INFLUENCE_MIN)
    expect(M42_FACTION_INFLUENCE_INITIAL).toBeLessThanOrEqual(M42_FACTION_INFLUENCE_MAX)
  })

  it('M42_FACTION_IMBALANCE_THRESHOLD in (0, 100)', () => {
    expect(M42_FACTION_IMBALANCE_THRESHOLD).toBeGreaterThan(0)
    expect(M42_FACTION_IMBALANCE_THRESHOLD).toBeLessThan(100)
  })

  it('M42_FACTION_EVENT_PRIORITY has 3 entries', () => {
    expect(M42_FACTION_EVENT_PRIORITY.length).toBe(3)
    expect(M42_FACTION_EVENT_PRIORITY[0]).toBe('coup')
  })

  it('M42_TRAIT_DIMENSIONS_COUNT === 3', () => {
    expect(M42_TRAIT_DIMENSIONS_COUNT).toBe(3)
  })

  it('M42_AI_DISASTER_RELIEF_PROPENSITY covers all 8 archetypes', () => {
    for (const archetype of EXPECTED_ARCHETYPES) {
      expect(Object.keys(M42_AI_DISASTER_RELIEF_PROPENSITY)).toContain(archetype)
    }
    expect(Object.keys(M42_AI_DISASTER_RELIEF_PROPENSITY).length).toBe(8)
  })

  it('M42_AI_DISASTER_RELIEF_PROPENSITY values are valid choice IDs', () => {
    const validChoices = ['open_granary', 'reduce_tax', 'forced_levy', 'ignore']
    for (const choice of Object.values(M42_AI_DISASTER_RELIEF_PROPENSITY)) {
      expect(validChoices).toContain(choice)
    }
  })

  it('at least 20 M42_ constants exported from balance.ts', () => {
    const m42Keys = Object.keys(balance).filter((k) => k.startsWith('M42_'))
    expect(m42Keys.length).toBeGreaterThanOrEqual(20)
  })

  it('M42_FACTION_EVENT_COOLDOWN_YEARS is positive', () => {
    expect(M42_FACTION_EVENT_COOLDOWN_YEARS).toBeGreaterThan(0)
  })

  it('M42_TRADE_ROUTE_MAX_PER_REALM is positive', () => {
    expect(M42_TRADE_ROUTE_MAX_PER_REALM).toBeGreaterThan(0)
  })
})
