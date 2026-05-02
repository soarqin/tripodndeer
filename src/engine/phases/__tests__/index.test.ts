import { describe, it, expect } from 'vitest'
import { PHASE_NAMES, PHASE_ORDER } from '../index'

describe('phase chain constants', () => {
  it('PHASE_ORDER has exactly 17 phases', () => {
    expect(PHASE_ORDER.length).toBe(17)
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
    expect(PHASE_ORDER[9]).toBe(PHASE_NAMES.REFORM)
    expect(PHASE_ORDER[10]).toBe(PHASE_NAMES.VICTORY_CHECK)
    expect(PHASE_ORDER[11]).toBe(PHASE_NAMES.DIPLOMACY_LIFECYCLE)
    expect(PHASE_ORDER[12]).toBe(PHASE_NAMES.ECONOMY)
    expect(PHASE_ORDER[13]).toBe(PHASE_NAMES.DISASTER)
    expect(PHASE_ORDER[14]).toBe(PHASE_NAMES.TRADE)
    expect(PHASE_ORDER[15]).toBe(PHASE_NAMES.FACTION)
    expect(PHASE_ORDER[16]).toBe(PHASE_NAMES.HISTORICAL_EVENTS)
  })

  it('DISASTER comes after ECONOMY', () => {
    const economyIdx = PHASE_ORDER.indexOf(PHASE_NAMES.ECONOMY)
    const disasterIdx = PHASE_ORDER.indexOf(PHASE_NAMES.DISASTER)
    expect(disasterIdx).toBe(economyIdx + 1)
  })

  it('TRADE comes after DISASTER', () => {
    const disasterIdx = PHASE_ORDER.indexOf(PHASE_NAMES.DISASTER)
    const tradeIdx = PHASE_ORDER.indexOf(PHASE_NAMES.TRADE)
    expect(tradeIdx).toBe(disasterIdx + 1)
  })

  it('FACTION comes after TRADE', () => {
    const tradeIdx = PHASE_ORDER.indexOf(PHASE_NAMES.TRADE)
    const factionIdx = PHASE_ORDER.indexOf(PHASE_NAMES.FACTION)
    expect(factionIdx).toBe(tradeIdx + 1)
  })

  it('HISTORICAL_EVENTS comes after FACTION', () => {
    const factionIdx = PHASE_ORDER.indexOf(PHASE_NAMES.FACTION)
    const historicalIdx = PHASE_ORDER.indexOf(PHASE_NAMES.HISTORICAL_EVENTS)
    expect(historicalIdx).toBe(factionIdx + 1)
  })
})
