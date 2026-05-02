import { describe, it, expect } from 'vitest'
import * as balance from '../balance'
import {
  M41_AI_REFORM_CHECK_INTERVAL_TICKS,
  M41_AI_PERSONALITY_REFORM_PROPENSITY,
  M41_REFORM_FAILURE_TREASURY_LOSS,
  M41_REFORM_FAILURE_COOLDOWN_YEARS,
  M41_REFORM_FAILED_SCAR_TRAIT,
  M41_REFORMS_COUNT,
  M41_REFORM_TRAIT_DIMENSIONS_COUNT,
  M41_REFORM_PREDICATE_KINDS_COUNT,
  M41_REFORMER_GRACE_PERIOD_YEARS,
  M41_REFORM_STAGE_LIMIT,
  M41_PRE_APPLIED_TRAITS,
  M41_PRE_APPLIED_POLITICAL_SYSTEMS,
} from '../balance'

describe('M4.1 balance constants', () => {
  it('M41_REFORMS_COUNT === 6', () => {
    expect(M41_REFORMS_COUNT).toBe(6)
  })

  it('all 8 archetypes present in M41_AI_PERSONALITY_REFORM_PROPENSITY', () => {
    const expectedArchetypes = [
      'conqueror', 'steward', 'schemer', 'learned',
      'tyrant', 'incompetent', 'benevolent', 'builder',
    ]
    for (const archetype of expectedArchetypes) {
      expect(M41_AI_PERSONALITY_REFORM_PROPENSITY[archetype]).toBeDefined()
    }
    expect(Object.keys(M41_AI_PERSONALITY_REFORM_PROPENSITY).length).toBe(8)
  })

  it('M41_PRE_APPLIED_TRAITS has exactly 4 realms (qin/zhao/chu/wei)', () => {
    const expectedRealms = ['realm_qin', 'realm_zhao', 'realm_chu', 'realm_wei']
    for (const realm of expectedRealms) {
      expect(M41_PRE_APPLIED_TRAITS[realm]).toBeDefined()
    }
    expect(Object.keys(M41_PRE_APPLIED_TRAITS).length).toBe(4)
  })

  it('M41_REFORM_FAILURE_COOLDOWN_YEARS === 10', () => {
    expect(M41_REFORM_FAILURE_COOLDOWN_YEARS).toBe(10)
  })

  it('M41_REFORM_STAGE_LIMIT === 5', () => {
    expect(M41_REFORM_STAGE_LIMIT).toBe(5)
  })

  it('at least 10 M41_ constants exported from balance.ts', () => {
    const m41Keys = Object.keys(balance).filter((k) => k.startsWith('M41_'))
    expect(m41Keys.length).toBeGreaterThanOrEqual(10)
  })

  it('M41_AI_REFORM_CHECK_INTERVAL_TICKS is positive', () => {
    expect(M41_AI_REFORM_CHECK_INTERVAL_TICKS).toBeGreaterThan(0)
  })

  it('M41_REFORM_FAILURE_TREASURY_LOSS is positive', () => {
    expect(M41_REFORM_FAILURE_TREASURY_LOSS).toBeGreaterThan(0)
  })

  it('M41_REFORM_FAILED_SCAR_TRAIT is a non-empty string', () => {
    expect(typeof M41_REFORM_FAILED_SCAR_TRAIT).toBe('string')
    expect(M41_REFORM_FAILED_SCAR_TRAIT.length).toBeGreaterThan(0)
  })

  it('M41_REFORM_TRAIT_DIMENSIONS_COUNT === 6', () => {
    expect(M41_REFORM_TRAIT_DIMENSIONS_COUNT).toBe(6)
  })

  it('M41_REFORM_PREDICATE_KINDS_COUNT === 12', () => {
    expect(M41_REFORM_PREDICATE_KINDS_COUNT).toBe(12)
  })

  it('M41_REFORMER_GRACE_PERIOD_YEARS is non-negative', () => {
    expect(M41_REFORMER_GRACE_PERIOD_YEARS).toBeGreaterThanOrEqual(0)
  })

  it('M41_PRE_APPLIED_POLITICAL_SYSTEMS has exactly 4 realms', () => {
    const expectedRealms = ['realm_qin', 'realm_zhao', 'realm_chu', 'realm_wei']
    for (const realm of expectedRealms) {
      expect(M41_PRE_APPLIED_POLITICAL_SYSTEMS[realm]).toBeDefined()
    }
    expect(Object.keys(M41_PRE_APPLIED_POLITICAL_SYSTEMS).length).toBe(4)
  })

  it('reform propensity values are between 0 and 1', () => {
    for (const [_archetype, propensity] of Object.entries(M41_AI_PERSONALITY_REFORM_PROPENSITY)) {
      expect(propensity).toBeGreaterThanOrEqual(0)
      expect(propensity).toBeLessThanOrEqual(1)
    }
  })
})
