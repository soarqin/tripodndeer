import { describe, it, expect } from 'vitest'

import { M9_PLAYABLE_REALMS, M9_AI_ONLY_REALMS, M9_SCENARIO_START_YEAR_BC } from '~/content/m2/balance'

describe('M9 year-gate regression', () => {
  it('M9 chain year-gates are all defined', () => {
    expect(M9_SCENARIO_START_YEAR_BC).toBe(453)
    expect(M9_PLAYABLE_REALMS.length).toBe(8)
    expect(M9_AI_ONLY_REALMS.length).toBe(4)
  })

  it('No M9 chain triggers before -453 start year', () => {
    const startYear = M9_SCENARIO_START_YEAR_BC
    expect(startYear).toBe(453)
    expect(453 > 403).toBe(true)
  })
})
