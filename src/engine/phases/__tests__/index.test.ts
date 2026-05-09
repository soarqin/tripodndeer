import { describe, it, expect } from 'vitest'
import { PHASE_NAMES, PHASE_ORDER } from '../index'

describe('phase chain constants', () => {
  it('PHASE_ORDER has exactly 27 phases (M8.1: aiPlan replaced by 3-layer pipeline)', () => {
    expect(PHASE_ORDER.length).toBe(27)
  })

  it('PHASE_ORDER is in correct order', () => {
    expect(PHASE_ORDER[0]).toBe(PHASE_NAMES.AI_STRATEGIC)
    expect(PHASE_ORDER[1]).toBe(PHASE_NAMES.AI_OPERATIONAL)
    expect(PHASE_ORDER[2]).toBe(PHASE_NAMES.AI_TACTICAL)
    expect(PHASE_ORDER[3]).toBe(PHASE_NAMES.ORDER_APPLY)
    expect(PHASE_ORDER[4]).toBe(PHASE_NAMES.MARCH)
    expect(PHASE_ORDER[5]).toBe(PHASE_NAMES.SIEGE)
    expect(PHASE_ORDER[6]).toBe(PHASE_NAMES.COMBAT_V2)
    expect(PHASE_ORDER[7]).toBe(PHASE_NAMES.CULTURAL_IDENTITY)
    expect(PHASE_ORDER[8]).toBe(PHASE_NAMES.MANPOWER)
    expect(PHASE_ORDER[9]).toBe(PHASE_NAMES.ESPIONAGE)
    expect(PHASE_ORDER[10]).toBe(PHASE_NAMES.RULER_LIFECYCLE)
    expect(PHASE_ORDER[11]).toBe(PHASE_NAMES.CHARACTER_LIFECYCLE)
    expect(PHASE_ORDER[12]).toBe(PHASE_NAMES.CHARACTER_SPAWN)
    expect(PHASE_ORDER[13]).toBe(PHASE_NAMES.RECRUITMENT)
    expect(PHASE_ORDER[14]).toBe(PHASE_NAMES.IDEOLOGY_DRIFT)
    expect(PHASE_ORDER[15]).toBe(PHASE_NAMES.REFORM)
    expect(PHASE_ORDER[16]).toBe(PHASE_NAMES.VICTORY_CHECK)
    expect(PHASE_ORDER[17]).toBe(PHASE_NAMES.DIPLOMACY_LIFECYCLE)
    expect(PHASE_ORDER[18]).toBe(PHASE_NAMES.ECONOMY)
    expect(PHASE_ORDER[19]).toBe(PHASE_NAMES.DISASTER)
    expect(PHASE_ORDER[20]).toBe(PHASE_NAMES.TRADE)
    expect(PHASE_ORDER[21]).toBe(PHASE_NAMES.FACTION)
    expect(PHASE_ORDER[22]).toBe(PHASE_NAMES.HISTORICAL_EVENTS)
    expect(PHASE_ORDER[23]).toBe(PHASE_NAMES.DIPLOMATIC_MEMORY)
    expect(PHASE_ORDER[24]).toBe(PHASE_NAMES.PERSONALITY_DRIFT)
    expect(PHASE_ORDER[25]).toBe(PHASE_NAMES.PRESTIGE_UPDATE)
    expect(PHASE_ORDER[26]).toBe(PHASE_NAMES.REALM_DEACTIVATION)
  })

  it('CULTURAL_IDENTITY comes after COMBAT_V2 and before MANPOWER', () => {
    const combatIdx = PHASE_ORDER.indexOf(PHASE_NAMES.COMBAT_V2)
    const culturalIdx = PHASE_ORDER.indexOf(PHASE_NAMES.CULTURAL_IDENTITY)
    const manpowerIdx = PHASE_ORDER.indexOf(PHASE_NAMES.MANPOWER)
    expect(culturalIdx).toBe(combatIdx + 1)
    expect(manpowerIdx).toBe(culturalIdx + 1)
  })

  it('ESPIONAGE comes after MANPOWER and before RULER_LIFECYCLE (D-G8)', () => {
    const manpowerIdx = PHASE_ORDER.indexOf(PHASE_NAMES.MANPOWER)
    const espionageIdx = PHASE_ORDER.indexOf(PHASE_NAMES.ESPIONAGE)
    const rulerIdx = PHASE_ORDER.indexOf(PHASE_NAMES.RULER_LIFECYCLE)
    expect(espionageIdx).toBe(manpowerIdx + 1)
    expect(rulerIdx).toBe(espionageIdx + 1)
  })

  it('IDEOLOGY_DRIFT comes after RECRUITMENT and before REFORM', () => {
    const recruitmentIdx = PHASE_ORDER.indexOf(PHASE_NAMES.RECRUITMENT)
    const ideologyIdx = PHASE_ORDER.indexOf(PHASE_NAMES.IDEOLOGY_DRIFT)
    const reformIdx = PHASE_ORDER.indexOf(PHASE_NAMES.REFORM)
    expect(ideologyIdx).toBe(recruitmentIdx + 1)
    expect(reformIdx).toBe(ideologyIdx + 1)
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

  it('PRESTIGE_UPDATE comes after HISTORICAL_EVENTS and before REALM_DEACTIVATION', () => {
    const historicalIdx = PHASE_ORDER.indexOf(PHASE_NAMES.HISTORICAL_EVENTS)
    const diplomaticIdx = PHASE_ORDER.indexOf(PHASE_NAMES.DIPLOMATIC_MEMORY)
    const personalityIdx = PHASE_ORDER.indexOf(PHASE_NAMES.PERSONALITY_DRIFT)
    const prestigeIdx = PHASE_ORDER.indexOf(PHASE_NAMES.PRESTIGE_UPDATE)
    const deactivationIdx = PHASE_ORDER.indexOf(PHASE_NAMES.REALM_DEACTIVATION)
    expect(diplomaticIdx).toBe(historicalIdx + 1)
    expect(personalityIdx).toBe(diplomaticIdx + 1)
    expect(prestigeIdx).toBe(personalityIdx + 1)
    expect(deactivationIdx).toBe(prestigeIdx + 1)
    expect(deactivationIdx).toBe(PHASE_ORDER.length - 1)
  })
})
