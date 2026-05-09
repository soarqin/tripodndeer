import { describe, it, expect } from 'vitest'
import { PHASE_NAMES, PHASE_ORDER } from '../index'

describe('phase pipeline membership', () => {
  it('includes 27 phases', () => {
    expect(PHASE_ORDER.length).toBe(27)
  })

  it('orders diplomaticMemory before personalityDrift before prestigeUpdate', () => {
    const diplomaticIdx = PHASE_ORDER.indexOf(PHASE_NAMES.DIPLOMATIC_MEMORY)
    const personalityIdx = PHASE_ORDER.indexOf(PHASE_NAMES.PERSONALITY_DRIFT)
    const prestigeIdx = PHASE_ORDER.indexOf(PHASE_NAMES.PRESTIGE_UPDATE)

    expect(diplomaticIdx).toBeGreaterThan(-1)
    expect(personalityIdx).toBeGreaterThan(diplomaticIdx)
    expect(prestigeIdx).toBeGreaterThan(personalityIdx)
  })
})
