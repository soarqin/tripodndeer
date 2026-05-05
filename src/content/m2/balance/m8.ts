import type {
  EdictKind,
  PersonalityArchetype,
  Specialty,
} from '~/shared/types'

// === M8 Personality Differentiation ===
export const M8_PERSONALITY_DIMENSIONS_COUNT = 8

export const M8_PERSONALITY_ARCHETYPE_LIST = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
] as const

export const M8_WAR_DECLARATION_BIAS: Record<PersonalityArchetype, number> = {
  conqueror: 0.4,
  steward: -0.3,
  schemer: 0.1,
  learned: -0.2,
  tyrant: 0.35,
  incompetent: 0.01,
  benevolent: -0.35,
  builder: -0.25,
}

export const M8_PEACE_ACCEPTANCE_THRESHOLD: Record<
  PersonalityArchetype,
  number
> = {
  conqueror: -0.3,
  steward: 0.2,
  schemer: 0.05,
  learned: 0.15,
  tyrant: -0.25,
  incompetent: 0.1,
  benevolent: 0.35,
  builder: 0.1,
}

export const M8_ALLIANCE_PROPENSITY: Record<PersonalityArchetype, number> = {
  conqueror: -0.1,
  steward: 0.2,
  schemer: 0.3,
  learned: 0.15,
  tyrant: -0.2,
  incompetent: 0.0,
  benevolent: 0.25,
  builder: 0.1,
}

export const M8_COALITION_JOIN_BIAS: Record<PersonalityArchetype, number> = {
  conqueror: 0.1,
  steward: -0.1,
  schemer: 0.3,
  learned: -0.15,
  tyrant: -0.25,
  incompetent: 0.0,
  benevolent: -0.1,
  builder: -0.05,
}

export const M8_RECRUITMENT_SPECIALTY_PREFERENCE: Record<
  PersonalityArchetype,
  Record<Specialty, number>
> = {
  conqueror: {
    commander: 2.5,
    warrior: 2.5,
    strategist: 1.0,
    administrator: 0.5,
    reformer: 0.5,
    diplomat: 0.5,
    spy: 0.8,
    scholar: 0.5,
    engineer: 0.7,
  },
  steward: {
    commander: 0.5,
    warrior: 0.5,
    strategist: 0.8,
    administrator: 3.0,
    reformer: 1.0,
    diplomat: 1.5,
    spy: 0.5,
    scholar: 1.2,
    engineer: 1.0,
  },
  schemer: {
    commander: 0.8,
    warrior: 0.8,
    strategist: 2.5,
    administrator: 0.8,
    reformer: 0.8,
    diplomat: 2.0,
    spy: 2.5,
    scholar: 0.8,
    engineer: 0.5,
  },
  learned: {
    commander: 0.5,
    warrior: 0.5,
    strategist: 1.5,
    administrator: 1.0,
    reformer: 1.5,
    diplomat: 1.5,
    spy: 0.5,
    scholar: 3.0,
    engineer: 1.0,
  },
  tyrant: {
    commander: 2.5,
    warrior: 2.0,
    strategist: 0.8,
    administrator: 0.5,
    reformer: 0.3,
    diplomat: 0.3,
    spy: 2.0,
    scholar: 0.3,
    engineer: 0.8,
  },
  incompetent: {
    commander: 1.0,
    warrior: 1.0,
    strategist: 1.0,
    administrator: 1.0,
    reformer: 1.0,
    diplomat: 1.0,
    spy: 1.0,
    scholar: 1.0,
    engineer: 1.0,
  },
  benevolent: {
    commander: 0.5,
    warrior: 0.5,
    strategist: 0.8,
    administrator: 2.5,
    reformer: 1.0,
    diplomat: 1.5,
    spy: 0.3,
    scholar: 2.0,
    engineer: 1.0,
  },
  builder: {
    commander: 0.5,
    warrior: 0.5,
    strategist: 0.8,
    administrator: 1.5,
    reformer: 3.0,
    diplomat: 0.8,
    spy: 0.5,
    scholar: 1.5,
    engineer: 2.5,
  },
}

export const M8_TAX_RATE_TARGET: Record<PersonalityArchetype, number> = {
  conqueror: 30,
  steward: 20,
  schemer: 22,
  learned: 18,
  tyrant: 40,
  incompetent: 20,
  benevolent: 10,
  builder: 18,
}

export const M8_TREASURY_RESERVE_FLOOR: Record<PersonalityArchetype, number> = {
  conqueror: 5000,
  steward: 8000,
  schemer: 6000,
  learned: 7000,
  tyrant: 3000,
  incompetent: 2000,
  benevolent: 6000,
  builder: 9000,
}

export const M8_EDICT_ENACTMENT_BIAS: Record<
  PersonalityArchetype,
  { issuanceMultiplier: number; preferredEdict: EdictKind | null }
> = {
  conqueror: { issuanceMultiplier: 1.5, preferredEdict: 'edict_grain_reserve' },
  steward: { issuanceMultiplier: 1.0, preferredEdict: 'edict_tax_relief' },
  schemer: { issuanceMultiplier: 1.3, preferredEdict: null },
  learned: { issuanceMultiplier: 0.9, preferredEdict: 'edict_tax_relief' },
  tyrant: { issuanceMultiplier: 1.5, preferredEdict: 'edict_grain_reserve' },
  incompetent: { issuanceMultiplier: 0.5, preferredEdict: null },
  benevolent: { issuanceMultiplier: 0.9, preferredEdict: 'edict_tax_relief' },
  builder: { issuanceMultiplier: 1.4, preferredEdict: null },
}
