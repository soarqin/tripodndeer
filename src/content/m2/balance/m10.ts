import type { PersonalityArchetype } from '~/shared/types'

import { M5_PERSONALITY_WEIGHTS } from './m5'

const M10_PERSONALITY_WEIGHTS = M5_PERSONALITY_WEIGHTS as Record<
  PersonalityArchetype,
  Record<string, number>
>

export interface ArchetypeTooltipEntry {
  name: string
  tagline: string
  multipliers: Record<string, number>
}

export const M10_ARCHETYPE_TOOLTIPS: Record<PersonalityArchetype, ArchetypeTooltipEntry> = {
  conqueror: {
    name: '征服者',
    tagline: '以战立国，开疆扩土',
    multipliers: M10_PERSONALITY_WEIGHTS.conqueror,
  },
  steward: {
    name: '治世者',
    tagline: '精耕细作，稳扎稳打',
    multipliers: M10_PERSONALITY_WEIGHTS.steward,
  },
  schemer: {
    name: '谋略家',
    tagline: '运筹帷幄，奇谋迭出',
    multipliers: M10_PERSONALITY_WEIGHTS.schemer,
  },
  learned: {
    name: '学者君',
    tagline: '博古通今，以智御政',
    multipliers: M10_PERSONALITY_WEIGHTS.learned,
  },
  tyrant: {
    name: '暴君',
    tagline: '雷厉风行，威权高压',
    multipliers: M10_PERSONALITY_WEIGHTS.tyrant,
  },
  incompetent: {
    name: '无能之辈',
    tagline: '优柔寡断，举棋不定',
    multipliers: M10_PERSONALITY_WEIGHTS.incompetent,
  },
  benevolent: {
    name: '仁君',
    tagline: '以德服人，广施仁政',
    multipliers: M10_PERSONALITY_WEIGHTS.benevolent,
  },
  builder: {
    name: '建设者',
    tagline: '励精图治，筑城积粮',
    multipliers: M10_PERSONALITY_WEIGHTS.builder,
  },
}
