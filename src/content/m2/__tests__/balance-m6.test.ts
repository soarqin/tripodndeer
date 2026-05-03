import { describe, expect, it } from 'vitest'
import * as balance from '../balance'
import {
  M6_ACADEMY_FAR_RATIO,
  M6_ACADEMY_HOST_RATIO,
  M6_ACADEMY_NEAR_RATIO,
  M6_CULTURAL_BARBARIAN_TO_BARBARIAN_YEARS,
  M6_CULTURAL_CHINESE_TO_BARBARIAN_YEARS,
  M6_CULTURAL_CHINESE_TO_CHINESE_YEARS,
  M6_ENABLED,
  M6_IDEOLOGY_ACADEMY_WEIGHT,
  M6_IDEOLOGY_POLICY_WEIGHT,
  M6_IDEOLOGY_RULER_PERSONALITY_WEIGHT,
  M6_IDEOLOGY_TALENT_WEIGHT,
  M6_PRESTIGE_ALLIANCE_WEIGHT,
  M6_PRESTIGE_CULTURE_DIFFUSION_WEIGHT,
  M6_PRESTIGE_LEGITIMACY_WEIGHT,
  M6_PRESTIGE_MILITARY_WEIGHT,
  M6_PRESTIGE_RITUAL_WEIGHT,
} from '../balance'

describe('M6 balance constants', () => {
  it('exports at least 25 M6_ constants', () => {
    const m6Keys = Object.keys(balance).filter((key) => key.startsWith('M6_'))
    expect(m6Keys.length).toBeGreaterThanOrEqual(25)
  })

  it('M6_ENABLED is a boolean feature flag', () => {
    expect(typeof M6_ENABLED).toBe('boolean')
  })

  it('cultural conversion years preserve the three-tier ordering', () => {
    expect(M6_CULTURAL_CHINESE_TO_CHINESE_YEARS).toBeLessThan(M6_CULTURAL_BARBARIAN_TO_BARBARIAN_YEARS)
    expect(M6_CULTURAL_BARBARIAN_TO_BARBARIAN_YEARS).toBeLessThan(M6_CULTURAL_CHINESE_TO_BARBARIAN_YEARS)
  })

  it('academy production ratios sum to 1.0', () => {
    expect(M6_ACADEMY_HOST_RATIO + M6_ACADEMY_NEAR_RATIO + M6_ACADEMY_FAR_RATIO).toBeCloseTo(1)
  })

  it('ideology source weights sum to 1.0', () => {
    const sum = M6_IDEOLOGY_RULER_PERSONALITY_WEIGHT
      + M6_IDEOLOGY_TALENT_WEIGHT
      + M6_IDEOLOGY_POLICY_WEIGHT
      + M6_IDEOLOGY_ACADEMY_WEIGHT

    expect(sum).toBeCloseTo(1)
  })

  it('prestige source weights sum to 1.0', () => {
    const sum = M6_PRESTIGE_LEGITIMACY_WEIGHT
      + M6_PRESTIGE_CULTURE_DIFFUSION_WEIGHT
      + M6_PRESTIGE_MILITARY_WEIGHT
      + M6_PRESTIGE_RITUAL_WEIGHT
      + M6_PRESTIGE_ALLIANCE_WEIGHT

    expect(sum).toBeCloseTo(1)
  })
})
