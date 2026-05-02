import { describe, it, expect } from 'vitest'
import { TraitEffectSchema } from '../schemas'
import type { TraitEffect, TraitModifiers } from '../types'

describe('TraitEffectSchema', () => {
  it('accepts an empty TraitEffect (all fields optional)', () => {
    const result = TraitEffectSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts a TraitEffect with a subset of fields populated', () => {
    const partial: TraitEffect = {
      manpowerCapMultiplierBp: 2000,
      foodProductionMultiplierBp: -1500,
    }
    const result = TraitEffectSchema.safeParse(partial)
    expect(result.success).toBe(true)
  })

  it('accepts a TraitEffect populated with every defined modifier', () => {
    const full: TraitEffect = {
      manpowerCapMultiplierBp: 1500,
      taxIncomeMultiplierBp: 1000,
      foodProductionMultiplierBp: 500,
      recruitmentSpeedMultiplierBp: 200,
      generalRecruitmentWeightBp: 800,
      combatPowerMultiplierBp: 1200,
    }
    const result = TraitEffectSchema.safeParse(full)
    expect(result.success).toBe(true)
  })

  it('rejects non-integer basis-point values', () => {
    const result = TraitEffectSchema.safeParse({ manpowerCapMultiplierBp: 12.5 })
    expect(result.success).toBe(false)
  })

  it('TraitModifiers requires every field (compile-time guarantee)', () => {
    const modifiers: TraitModifiers = {
      manpowerCapMultiplierBp: 0,
      taxIncomeMultiplierBp: 0,
      foodProductionMultiplierBp: 0,
      recruitmentSpeedMultiplierBp: 0,
      generalRecruitmentWeightBp: 0,
      combatPowerMultiplierBp: 0,
      disasterResistanceMultiplierBp: 0,
      tradeIncomeMultiplierBp: 0,
      factionStabilityBonusBp: 0,
    }
    expect(modifiers.manpowerCapMultiplierBp).toBe(0)
    expect(modifiers.combatPowerMultiplierBp).toBe(0)
  })
})
