import { describe, expect, it } from 'vitest'
import {
  M9_ENABLED,
  M9_SCENARIO_VERSION,
  M9_PLAYABLE_REALMS,
  M9_AI_ONLY_REALMS,
  M9_REALM_COUNT,
  M9_SITE_COUNT,
  M9_REGION_COUNT,
  M9_CHARACTER_TEMPLATE_COUNT,
  M9_SCENARIO_START_YEAR_BC,
  M9_SCENARIO_END_YEAR_BC,
  M9_FORBIDDEN_ANACHRONISM_STRINGS,
  M9_REALM_DEACTIVATION_HISTORICAL_YEARS,
  M8_PERSONALITY_DIMENSIONS_COUNT,
  M8_PERSONALITY_ARCHETYPE_LIST,
} from '../balance'

describe('M9 balance invariants', () => {
  it('M9_ENABLED is true', () => { expect(M9_ENABLED).toBe(true) })

  it('M9_SCENARIO_VERSION is 8', () => { expect(M9_SCENARIO_VERSION).toBe(8) })

  it('M9_PLAYABLE_REALMS has 8 entries', () => { expect(M9_PLAYABLE_REALMS.length).toBe(8) })

  it('M9_AI_ONLY_REALMS has 4 entries', () => { expect(M9_AI_ONLY_REALMS.length).toBe(4) })

  it('M9_REALM_COUNT is 12', () => { expect(M9_REALM_COUNT).toBe(12) })

  it('M9_PLAYABLE_REALMS + M9_AI_ONLY_REALMS = 12 unique realms', () => {
    const all = [...M9_PLAYABLE_REALMS, ...M9_AI_ONLY_REALMS]
    expect(all.length).toBe(12)
    expect(new Set(all).size).toBe(12)
  })

  it('M9_FORBIDDEN_ANACHRONISM_STRINGS has 7 entries', () => {
    expect(M9_FORBIDDEN_ANACHRONISM_STRINGS.length).toBe(7)
  })

  it('M9_FORBIDDEN_ANACHRONISM_STRINGS contains required strings', () => {
    const forbidden = M9_FORBIDDEN_ANACHRONISM_STRINGS as readonly string[]
    expect(forbidden).toContain('皇帝')
    expect(forbidden).toContain('火药')
    expect(forbidden).toContain('马镫')
    expect(forbidden).toContain('独尊儒术')
    expect(forbidden).toContain('宋词')
    expect(forbidden).toContain('造纸')
    expect(forbidden).toContain('马凯铁骑')
  })

  it('M9_SCENARIO_START_YEAR_BC is 453', () => { expect(M9_SCENARIO_START_YEAR_BC).toBe(453) })

  it('M9_SCENARIO_END_YEAR_BC is 221', () => { expect(M9_SCENARIO_END_YEAR_BC).toBe(221) })

  it('M9_SITE_COUNT is 250', () => { expect(M9_SITE_COUNT).toBe(250) })

  it('M9_REGION_COUNT is 9', () => { expect(M9_REGION_COUNT).toBe(9) })

  it('M9_CHARACTER_TEMPLATE_COUNT is 90', () => { expect(M9_CHARACTER_TEMPLATE_COUNT).toBe(90) })

  it('M9_REALM_DEACTIVATION_HISTORICAL_YEARS has 9 entries', () => {
    expect(Object.keys(M9_REALM_DEACTIVATION_HISTORICAL_YEARS).length).toBe(9)
  })

  it('M8 archetype count unchanged (8)', () => {
    expect(M8_PERSONALITY_DIMENSIONS_COUNT).toBe(8)
    expect(M8_PERSONALITY_ARCHETYPE_LIST.length).toBe(8)
  })
})
