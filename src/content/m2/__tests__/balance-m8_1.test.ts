import { describe, it, expect } from 'vitest'
import { M8_1_STRATEGIC_WEIGHTS } from '../balance/m8_1'

describe('M8_1_STRATEGIC_WEIGHTS', () => {
  it('all 8 archetypes have a row', () => {
    const archetypes = ['conqueror','steward','schemer','learned','tyrant','incompetent','benevolent','builder']
    for (const archetype of archetypes) {
      expect(M8_1_STRATEGIC_WEIGHTS[archetype]).toBeDefined()
    }
  })
  it('conqueror expansionAggression > steward expansionAggression', () => {
    expect(M8_1_STRATEGIC_WEIGHTS.conqueror.expansionAggression).toBeGreaterThan(M8_1_STRATEGIC_WEIGHTS.steward.expansionAggression)
  })
  it('tyrant allyPriority < benevolent allyPriority', () => {
    expect(M8_1_STRATEGIC_WEIGHTS.tyrant.allyPriority).toBeLessThan(M8_1_STRATEGIC_WEIGHTS.benevolent.allyPriority)
  })
  it('builder reformInclination > incompetent reformInclination', () => {
    expect(M8_1_STRATEGIC_WEIGHTS.builder.reformInclination).toBeGreaterThan(M8_1_STRATEGIC_WEIGHTS.incompetent.reformInclination)
  })
  it('schemer enemyPersistence > learned enemyPersistence', () => {
    expect(M8_1_STRATEGIC_WEIGHTS.schemer.enemyPersistence).toBeGreaterThan(M8_1_STRATEGIC_WEIGHTS.learned.enemyPersistence)
  })
  it('no opportunist or zealot strings exist', () => {
    expect(JSON.stringify(M8_1_STRATEGIC_WEIGHTS)).not.toMatch(/opportunist|zealot/)
  })
})
