export type UnitType = 'infantry' | 'chariot' | 'cavalry' | 'crossbow'
export type TerrainType = 'plains' | 'hills' | 'mountains' | 'forest' | 'swamp' | 'grassland' | 'desert'
export type TacticId = 'qi-zheng' | 'sheng-dong' | 'you-di' | 'bei-shui' | 'wei-shi' | 'yi-zhan' | 'pi-di'

export const UNIT_BASE_POWER: Record<UnitType, number> = {
  infantry: 10,
  chariot: 15,
  cavalry: 12,
  crossbow: 11,
}

// Counter matrix: attacker row vs defender column
// Values > 1.0 mean attacker advantage, < 1.0 mean disadvantage
export const UNIT_COUNTER_MATRIX: Record<UnitType, Record<UnitType, number>> = {
  infantry: { infantry: 1.0, chariot: 0.8, cavalry: 1.2, crossbow: 1.3 },
  chariot: { infantry: 1.2, chariot: 1.0, cavalry: 1.1, crossbow: 0.6 },
  cavalry: { infantry: 0.9, chariot: 0.9, cavalry: 1.0, crossbow: 1.1 },
  crossbow: { infantry: 0.8, chariot: 1.4, cavalry: 0.9, crossbow: 1.0 },
}

export const TERRAIN_DEFENSE: Record<TerrainType, number> = {
  plains: 0.0,
  hills: 0.2,
  mountains: 0.5,
  forest: 0.25,
  swamp: 0.3,
  grassland: -0.1,
  desert: -0.2,
}

export const TERRAIN_TRAVEL_COST: Record<TerrainType, number> = {
  plains: 1.0,
  hills: 1.3,
  mountains: 2.0,
  forest: 1.4,
  swamp: 1.8,
  grassland: 0.9,
  desert: 1.6,
}

export const GENERAL_MIGHT_SCALING = 0.01
export const GENERAL_COMMAND_CAP_BASE = 5000
export const GENERAL_LOSER_DEATH_RATE = 0.05
export const GENERAL_WINNER_DEATH_RATE = 0.01

export interface TacticEffect {
  attackMultiplier?: number
  defenseMultiplier?: number
  lossBonusMultiplier?: number
  moraleCrashChance?: number
  postBattleManpowerGain?: number
}

export const TACTIC_COSTS: Record<TacticId, number> = {
  'qi-zheng': 15,
  'sheng-dong': 10,
  'you-di': 8,
  'bei-shui': 20,
  'wei-shi': 12,
  'yi-zhan': 5,
  'pi-di': 0,
}

export const TACTIC_EFFECTS: Record<TacticId, TacticEffect> = {
  'qi-zheng': { attackMultiplier: 1.2, defenseMultiplier: 0.8 },
  'sheng-dong': { defenseMultiplier: 0.8 },
  'you-di': { attackMultiplier: 1.3 },
  'bei-shui': { attackMultiplier: 1.5, lossBonusMultiplier: 1.3 },
  'wei-shi': { moraleCrashChance: 0.4 },
  'yi-zhan': { postBattleManpowerGain: 500 },
  'pi-di': { defenseMultiplier: 0.75 },
}

export const MANPOWER_RECOVERY_PER_MONTH = 500
export const WAR_WEARINESS_PER_MONTH_AT_WAR = 5
export const WAR_WEARINESS_RECOVERY_THRESHOLD = 30
export const RNG_VARIANCE_PERCENT = 0.1
export const PEACE_INDEMNITY_MAX = 100000
export const PEACE_TRIBUTE_AMOUNT_MAX = 5000
export const PEACE_TRIBUTE_YEARS_MAX = 10

export const DIPLOMACY_ATTITUDE_MIN = -100
export const DIPLOMACY_ATTITUDE_MAX = 100
export const DIPLOMACY_TRUST_MIN = 0
export const DIPLOMACY_TRUST_MAX = 100
export const DIPLOMACY_PROPOSAL_DURATION_TICKS = 9
export const DIPLOMACY_TRUCE_DURATION_TICKS = 36
export const DIPLOMACY_NON_AGGRESSION_DURATION_TICKS = 72
export const DIPLOMACY_COALITION_THREAT_THRESHOLD = 70
export const DIPLOMACY_COALITION_DISSOLVE_THREAT_THRESHOLD = 45
export const DIPLOMACY_COALITION_MIN_MEMBERS = 2
export const DIPLOMACY_COALITION_WAR_THREAT_BONUS = 20
export const DIPLOMACY_BETRAYAL_TRUST_DELTA = -30
export const DIPLOMACY_THIRD_PARTY_DECLARE_WAR_AGGRESSOR_ATTITUDE_DELTA = -12
export const DIPLOMACY_THIRD_PARTY_DECLARE_WAR_AGGRESSOR_TRUST_DELTA = -6
export const DIPLOMACY_THIRD_PARTY_DECLARE_WAR_TARGET_ATTITUDE_DELTA = 4
export const DIPLOMACY_THIRD_PARTY_DECLARE_WAR_TARGET_TRUST_DELTA = 2
export const DIPLOMACY_ACCEPTANCE_BASE = 0
export const DIPLOMACY_ACCEPTANCE_ATTITUDE_THRESHOLD = 0
export const DIPLOMACY_ACCEPTANCE_TRUST_THRESHOLD = 50
export const DIPLOMACY_ACCEPTANCE_ATTITUDE_WEIGHT = 0.5
export const DIPLOMACY_ACCEPTANCE_TRUST_WEIGHT = 0.4
export const DIPLOMACY_ACCEPTANCE_EXISTING_WAR_MODIFIER = -40
export const DIPLOMACY_ACCEPTANCE_TRUCE_MODIFIER = -80
export const DIPLOMACY_ACCEPTANCE_TREATY_CONFLICT_MODIFIER = -60
export const DIPLOMACY_ACCEPTANCE_THREAT_WEIGHT = 0.2
export const DIPLOMACY_ZHOU_INVESTITURE_ACCEPTANCE_MODIFIER = 10
export const DIPLOMACY_ZHOU_INVESTITURE_REACTION_MODIFIER = 10
export const DIPLOMACY_THREAT_SITE_POWER = 10
export const DIPLOMACY_THREAT_ARMY_MANPOWER_DIVISOR = 1000
export const DIPLOMACY_THREAT_MANPOWER_DIVISOR = 1000
export const DIPLOMACY_RELATION_DRIFT_INTERVAL_TICKS = 6
export const DIPLOMACY_RELATION_DRIFT_DELTA = 1
export const DIPLOMACY_RELATION_NEUTRAL_ATTITUDE = 0
export const DIPLOMACY_RELATION_NEUTRAL_TRUST = 50
export const DIPLOMACY_ACTION_COSTS = {
  alliance: 35,
  non_aggression: 15,
  tribute: 25,
  marriage: 20,
  envoy: 5,
  declare_war: 30,
  peace: 10,
}
