import { describe, expect, it } from 'vitest'
import { TraitEffectSchema } from '../schemas'
import type { TraitEffect } from '../types'

describe('M6 TraitEffect ideologyDeltaBp', () => {
  it('allows a partial ideology delta map at type level', () => {
    const effect: TraitEffect = {
      ideologyDeltaBp: { fa: 100, ru: -50 },
    }

    expect(effect.ideologyDeltaBp?.fa).toBe(100)
    expect(effect.ideologyDeltaBp?.ru).toBe(-50)
  })

  it('TraitEffectSchema accepts ideologyDeltaBp with valid ideology keys', () => {
    const result = TraitEffectSchema.safeParse({
      ideologyDeltaBp: { dao: 25, bing: 75 },
    })

    expect(result.success).toBe(true)
  })

  it('TraitEffectSchema keeps ideologyDeltaBp optional', () => {
    const result = TraitEffectSchema.safeParse({
      manpowerCapMultiplierBp: 500,
    })

    expect(result.success).toBe(true)
  })

  it('TraitEffectSchema rejects unknown ideology keys', () => {
    const result = TraitEffectSchema.safeParse({
      ideologyDeltaBp: { fa: 100, xuanxue: 25 },
    })

    expect(result.success).toBe(false)
  })
})
