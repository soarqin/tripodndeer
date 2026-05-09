import { describe, expect, it } from 'vitest'
import { RulerPersonalityProfileSchema } from '../schemas'

const validProfile = {
  expansionDrive: 0.8,
  diplomaticTrust: 0.4,
  caution: 0.6,
  honor: 0.7,
  vindictiveness: 0.2,
  reformInclination: 0.5,
  patience: 0.3,
  preferredStrategy: 'siege' as const,
}

describe('RulerPersonalityProfileSchema', () => {
  it('accepts all 8 fields', () => {
    const result = RulerPersonalityProfileSchema.safeParse(validProfile)
    expect(result.success).toBe(true)
    expect(Object.keys(validProfile)).toHaveLength(8)
  })

  it('rejects expansionDrive above 1', () => {
    const result = RulerPersonalityProfileSchema.safeParse({ ...validProfile, expansionDrive: 1.5 })
    expect(result.success).toBe(false)
  })

  it('rejects caution below 0', () => {
    const result = RulerPersonalityProfileSchema.safeParse({ ...validProfile, caution: -0.1 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid preferredStrategy values', () => {
    const result = RulerPersonalityProfileSchema.safeParse({ ...validProfile, preferredStrategy: 'ambush' })
    expect(result.success).toBe(false)
  })
})
