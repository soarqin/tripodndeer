import { describe, it, expect } from 'vitest'
import { PHASE_NAMES, PHASE_ORDER } from '../index'

describe('phase chain constants', () => {
  it('PHASE_ORDER has exactly 13 phases', () => {
    expect(PHASE_ORDER.length).toBe(13)
  })

  it('PHASE_ORDER is in correct order', () => {
    expect(PHASE_ORDER[0]).toBe(PHASE_NAMES.AI_PLAN)
    expect(PHASE_ORDER[1]).toBe(PHASE_NAMES.ORDER_APPLY)
    expect(PHASE_ORDER[2]).toBe(PHASE_NAMES.MARCH)
    expect(PHASE_ORDER[3]).toBe(PHASE_NAMES.SIEGE)
    expect(PHASE_ORDER[4]).toBe(PHASE_NAMES.COMBAT_V2)
    expect(PHASE_ORDER[5]).toBe(PHASE_NAMES.MANPOWER)
    expect(PHASE_ORDER[6]).toBe(PHASE_NAMES.RULER_LIFECYCLE)
    expect(PHASE_ORDER[7]).toBe(PHASE_NAMES.CHARACTER_LIFECYCLE)
    expect(PHASE_ORDER[8]).toBe(PHASE_NAMES.RECRUITMENT)
    expect(PHASE_ORDER[9]).toBe(PHASE_NAMES.VICTORY_CHECK)
    expect(PHASE_ORDER[10]).toBe(PHASE_NAMES.DIPLOMACY_LIFECYCLE)
    expect(PHASE_ORDER[11]).toBe(PHASE_NAMES.ECONOMY)
    expect(PHASE_ORDER[12]).toBe(PHASE_NAMES.HISTORICAL_EVENTS)
  })
})
