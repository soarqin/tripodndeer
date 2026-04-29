import { describe, it, expect } from 'vitest'
import { PHASE_NAMES, PHASE_ORDER } from '../index'

describe('phase chain constants', () => {
  it('PHASE_ORDER has exactly 5 phases', () => {
    expect(PHASE_ORDER.length).toBe(5)
  })

  it('PHASE_ORDER contains all expected phase names', () => {
    expect(PHASE_ORDER).toContain(PHASE_NAMES.AI_PLAN)
    expect(PHASE_ORDER).toContain(PHASE_NAMES.ORDER_APPLY)
    expect(PHASE_ORDER).toContain(PHASE_NAMES.MARCH)
    expect(PHASE_ORDER).toContain(PHASE_NAMES.COMBAT)
    expect(PHASE_ORDER).toContain(PHASE_NAMES.VICTORY_CHECK)
  })

  it('PHASE_ORDER is in correct order (aiPlan first, victoryCheck last)', () => {
    expect(PHASE_ORDER[0]).toBe(PHASE_NAMES.AI_PLAN)
    expect(PHASE_ORDER[4]).toBe(PHASE_NAMES.VICTORY_CHECK)
  })
})
