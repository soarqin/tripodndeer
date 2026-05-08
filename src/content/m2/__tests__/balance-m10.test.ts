import { describe, expect, it } from 'vitest'

import { M10_ARCHETYPE_TOOLTIPS, M5_PERSONALITY_WEIGHTS } from '~/content/m2/balance'
import type { PersonalityArchetype } from '~/shared/types'

const ARCHETYPES: PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

const EXPECTED_LABELS: Record<PersonalityArchetype, { name: string; tagline: string }> = {
  conqueror: { name: '征服者', tagline: '以战立国，开疆扩土' },
  steward: { name: '治世者', tagline: '精耕细作，稳扎稳打' },
  schemer: { name: '谋略家', tagline: '运筹帷幄，奇谋迭出' },
  learned: { name: '学者君', tagline: '博古通今，以智御政' },
  tyrant: { name: '暴君', tagline: '雷厉风行，威权高压' },
  incompetent: { name: '无能之辈', tagline: '优柔寡断，举棋不定' },
  benevolent: { name: '仁君', tagline: '以德服人，广施仁政' },
  builder: { name: '建设者', tagline: '励精图治，筑城积粮' },
}

describe('M10 archetype tooltips', () => {
  it('covers all 8 archetypes', () => {
    expect(Object.keys(M10_ARCHETYPE_TOOLTIPS)).toHaveLength(8)
    expect(Object.keys(M10_ARCHETYPE_TOOLTIPS).sort()).toEqual([...ARCHETYPES].sort())
  })

  it('matches M5_PERSONALITY_WEIGHTS as source of truth', () => {
    for (const archetype of ARCHETYPES) {
      expect(M10_ARCHETYPE_TOOLTIPS[archetype].name).toBe(EXPECTED_LABELS[archetype].name)
      expect(M10_ARCHETYPE_TOOLTIPS[archetype].tagline).toBe(EXPECTED_LABELS[archetype].tagline)
      expect(M10_ARCHETYPE_TOOLTIPS[archetype].multipliers).toEqual(M5_PERSONALITY_WEIGHTS[archetype])
    }
  })
})
