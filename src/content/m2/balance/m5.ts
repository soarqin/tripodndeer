import type { PersonalityArchetype, RulerPersonalityProfile } from '~/shared/types'

export const M5_RULER_BASE_LIFESPAN = 65
export const M5_RULER_LIFESPAN_VARIANCE = 5
export const M5_HEALTH_DECREASE_PER_YEAR = 1
export const M5_HEALTH_DEATH_THRESHOLD = 0

export const M5_LOYALTY_SHIRKING_THRESHOLD = 60
export const M5_LOYALTY_DEPARTURE_THRESHOLD = 40
export const M5_LOYALTY_SECRET_CONTACT_THRESHOLD = 25
export const M5_LOYALTY_DEFECTION_THRESHOLD = 10

export const M5_RECRUITMENT_PER_REALM_PER_YEAR = 1
export const M5_RECRUITMENT_NAMING_POOL_SIZE = 60

export const M5_GOVERNOR_TAX_BONUS_PER_ZHENG = 0.5
export const M5_GOVERNOR_FOOD_BONUS_PER_ZHENG = 0.5

export const M5_ARMY_CAP_BONUS_PER_WU = 100

export const M5_PERSONALITY_WEIGHTS: Record<string, Record<string, number>> = {
  conqueror: {
    attack: 3.0,
    retreat: 0.5,
    'siege-continue': 2.0,
    'cut-supply': 1.5,
    recruit: 1.5,
    diplomacy: 0.5,
    economy: 0.5,
  },
  steward: {
    attack: 0.5,
    retreat: 1.5,
    'siege-continue': 0.5,
    'cut-supply': 1.0,
    recruit: 1.0,
    diplomacy: 1.5,
    economy: 3.0,
  },
  schemer: {
    attack: 1.5,
    retreat: 1.0,
    'siege-continue': 1.5,
    'cut-supply': 1.8,
    recruit: 1.0,
    diplomacy: 2.0,
    economy: 1.0,
  },
  learned: {
    attack: 0.4,
    retreat: 1.2,
    'siege-continue': 0.6,
    'cut-supply': 1.0,
    recruit: 1.0,
    diplomacy: 2.0,
    economy: 2.5,
  },
  tyrant: {
    attack: 2.5,
    retreat: 0.3,
    'siege-continue': 2.5,
    'cut-supply': 0.5,
    recruit: 1.5,
    diplomacy: 0.3,
    economy: 0.5,
  },
  incompetent: {
    attack: 1.0,
    retreat: 1.5,
    'siege-continue': 0.5,
    'cut-supply': 1.0,
    recruit: 0.5,
    diplomacy: 1.0,
    economy: 1.0,
  },
  benevolent: {
    attack: 0.3,
    retreat: 2.0,
    'siege-continue': 0.3,
    'cut-supply': 0.8,
    recruit: 1.0,
    diplomacy: 2.5,
    economy: 2.0,
  },
  builder: {
    attack: 0.6,
    retreat: 1.0,
    'siege-continue': 0.4,
    'cut-supply': 1.0,
    recruit: 1.5,
    diplomacy: 1.5,
    economy: 3.0,
  },
}

export const M5_SPECIALTY_WEIGHTS_RECRUITMENT: Record<string, number> = {
  commander: 0.1,
  warrior: 0.2,
  strategist: 0.15,
  administrator: 0.2,
  reformer: 0.05,
  diplomat: 0.1,
  spy: 0.08,
  scholar: 0.07,
  engineer: 0.05,
}

export const M5_PERSONALITY_DIMS_BASELINE: Readonly<Record<PersonalityArchetype, RulerPersonalityProfile>> = {
  conqueror: {
    expansionDrive: 0.85,
    caution: 0.3,
    vindictiveness: 0.6,
    patience: 0.3,
    diplomaticTrust: 0.4,
    honor: 0.5,
    reformInclination: 0.5,
    preferredStrategy: 'blitz',
  },
  steward: {
    expansionDrive: 0.2,
    caution: 0.7,
    vindictiveness: 0.2,
    patience: 0.7,
    diplomaticTrust: 0.6,
    honor: 0.6,
    reformInclination: 0.6,
    preferredStrategy: 'attrition',
  },
  schemer: {
    expansionDrive: 0.5,
    caution: 0.6,
    vindictiveness: 0.6,
    patience: 0.6,
    diplomaticTrust: 0.3,
    honor: 0.3,
    reformInclination: 0.4,
    preferredStrategy: 'diplomatic',
  },
  learned: {
    expansionDrive: 0.4,
    caution: 0.6,
    vindictiveness: 0.2,
    patience: 0.7,
    diplomaticTrust: 0.7,
    honor: 0.8,
    reformInclination: 0.4,
    preferredStrategy: 'diplomatic',
  },
  tyrant: {
    expansionDrive: 0.7,
    caution: 0.25,
    vindictiveness: 0.85,
    patience: 0.3,
    diplomaticTrust: 0.2,
    honor: 0.2,
    reformInclination: 0.3,
    preferredStrategy: 'blitz',
  },
  incompetent: {
    expansionDrive: 0.5,
    caution: 0.5,
    vindictiveness: 0.5,
    patience: 0.5,
    diplomaticTrust: 0.5,
    honor: 0.5,
    reformInclination: 0.5,
    preferredStrategy: 'attrition',
  },
  benevolent: {
    expansionDrive: 0.2,
    caution: 0.6,
    vindictiveness: 0.2,
    patience: 0.7,
    diplomaticTrust: 0.7,
    honor: 0.7,
    reformInclination: 0.5,
    preferredStrategy: 'diplomatic',
  },
  builder: {
    expansionDrive: 0.3,
    caution: 0.55,
    vindictiveness: 0.3,
    patience: 0.7,
    diplomaticTrust: 0.5,
    honor: 0.6,
    reformInclination: 0.85,
    preferredStrategy: 'siege',
  },
}
