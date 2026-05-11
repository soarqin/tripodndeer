import { describe, it, expect } from 'vitest'
import { SCENARIO_CONFIGS } from '../scenario-configs'

describe('SCENARIO_CONFIGS', () => {
  it('contains exactly 3 configs', () => {
    expect(SCENARIO_CONFIGS.length).toBe(3)
  })

  it('contains m1, m9, and tutorial ids', () => {
    const ids = SCENARIO_CONFIGS.map((c) => c.id)
    expect(ids).toContain('m1')
    expect(ids).toContain('m9')
    expect(ids).toContain('tutorial')
  })

  it('has all required fields for each config', () => {
    for (const config of SCENARIO_CONFIGS) {
      expect(config.id).toBeDefined()
      expect(config.name).toBeDefined()
      expect(config.description).toBeDefined()
      expect(config.difficulty).toBeDefined()
      expect(config.recommendedRealms).toBeDefined()
      expect(config.thumbnailType).toBeDefined()
    }
  })
})
