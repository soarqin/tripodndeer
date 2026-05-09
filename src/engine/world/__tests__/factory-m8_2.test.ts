import { describe, expect, it } from 'vitest'

import { M5_PERSONALITY_DIMS_BASELINE } from '~/content/m2/balance'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type { M1DataV8 } from '~/shared/schemas'
import type { PersonalityArchetype, RulerState } from '~/shared/types'

function withSyntheticRuler(
  data: M1DataV8,
  realmId: string,
  generalId: string,
  personality: PersonalityArchetype,
): M1DataV8 {
  const synthetic: RulerState = {
    realmId,
    generalId,
    age: 45,
    lifespan: 65,
    health: 80,
    personality,
    personalityDims: {
      expansionDrive: 0.01,
      diplomaticTrust: 0.01,
      caution: 0.01,
      honor: 0.01,
      vindictiveness: 0.01,
      reformInclination: 0.01,
      patience: 0.01,
      preferredStrategy: 'attrition',
    },
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
  return { ...data, rulers: [...data.rulers, synthetic] }
}

describe('factory M8.2 — difficulty + diplomaticMemory + personalityDims seeding', () => {
  it('defaults difficulty to "hero" when not provided', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    expect(world.difficulty).toBe('hero')
  })

  it('uses explicit difficulty when provided ("sage")', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin', 'sage')
    expect(world.difficulty).toBe('sage')
  })

  it('initializes empty diplomaticMemory map', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    expect(world.diplomaticMemory).toBeInstanceOf(Map)
    expect(world.diplomaticMemory.size).toBe(0)
  })

  it('overrides every ruler personalityDims from M5_PERSONALITY_DIMS_BASELINE[ruler.personality]', () => {
    const archetypes: PersonalityArchetype[] = [
      'conqueror',
      'steward',
      'schemer',
      'learned',
      'tyrant',
      'incompetent',
      'benevolent',
      'builder',
    ]
    let data = loadM1Data()
    archetypes.forEach((p, i) => {
      data = withSyntheticRuler(data, `realm_synth_${i}`, `gen_synth_${i}`, p)
    })

    const world = createWorldFromM1Data(data, 42, 'realm_qin')

    expect(world.rulers.size).toBe(archetypes.length)
    for (const ruler of world.rulers.values()) {
      expect(ruler.personalityDims).toEqual(M5_PERSONALITY_DIMS_BASELINE[ruler.personality])
    }
  })

  it('clones the baseline (does not share reference with M5_PERSONALITY_DIMS_BASELINE)', () => {
    const data = withSyntheticRuler(loadM1Data(), 'realm_synth_a', 'gen_synth_a', 'conqueror')
    const world = createWorldFromM1Data(data, 42, 'realm_qin')

    const ruler = world.rulers.get('realm_synth_a')!
    expect(ruler.personalityDims).not.toBe(M5_PERSONALITY_DIMS_BASELINE.conqueror)
    expect(ruler.personalityDims).toEqual(M5_PERSONALITY_DIMS_BASELINE.conqueror)
  })

  it('accepts all difficulty tiers without throwing', () => {
    const tiers = ['weak', 'common', 'hero', 'hegemon', 'sage'] as const
    for (const tier of tiers) {
      const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin', tier)
      expect(world.difficulty).toBe(tier)
    }
  })
})
