// === M4.2 Disaster / Trade / Faction System ===
export const M42_DISASTER_COUNT = 6
export const M42_DISASTER_TYPES: readonly string[] = [
  'disaster_feng_nian',
  'disaster_qian_nian',
  'disaster_da_han',
  'disaster_da_shui',
  'disaster_huang_zai',
  'disaster_wen_yi',
]
export const M42_DISASTER_BASE_PROBABILITY_BP: Record<string, number> = {
  disaster_feng_nian: 800,
  disaster_qian_nian: 600,
  disaster_da_han: 400,
  disaster_da_shui: 300,
  disaster_huang_zai: 500,
  disaster_wen_yi: 200,
}
export const M42_DISASTER_RELIEF_CHOICES: readonly string[] = [
  'open_granary',
  'reduce_tax',
  'forced_levy',
  'ignore',
]
export const M42_DISASTER_OPEN_GRANARY_FOOD_COST = 2000
export const M42_DISASTER_REDUCE_TAX_TREASURY_LOSS = 500
export const M42_DISASTER_FORCED_LEVY_TREASURY_GAIN = 300
export const M42_DISASTER_COOLDOWN_TICKS = 36
export const M42_DISASTER_DECISION_TIMEOUT_TICKS = 3
export const M42_TRADE_ROUTE_BASE_INCOME_PER_XUN = 50
export const M42_TRADE_ROUTE_MAX_PER_REALM = 12
export const M42_TRADE_ROUTE_DISTANCE_PENALTY_BP_PER_HOP = 200
export const M42_TRADE_ROUTE_INITIAL_COUNT = 6
export const M42_TRADE_FACTION_INFLUENCE_PER_ROUTE_PER_YEAR = 5
export const M42_TRADE_ATTITUDE_BONUS_PER_YEAR = 2
export const M42_TRADE_MAX_HOPS_FALLBACK = 5
export const M42_FACTION_COUNT = 6
export const M42_FACTION_INFLUENCE_INITIAL = 50
export const M42_FACTION_INFLUENCE_MIN = 0
export const M42_FACTION_INFLUENCE_MAX = 100
export const M42_FACTION_IMBALANCE_THRESHOLD = 70
export const M42_FACTION_EVENT_COOLDOWN_YEARS = 5
export const M42_FACTION_EVENT_PRIORITY: readonly string[] = [
  'coup',
  'split',
  'overthrow',
]
export const M42_FACTION_DRIFT_PER_GENERAL_BP = 50
export const M42_TRAIT_DIMENSIONS_COUNT = 3
export const M42_FACTION_BALANCE_PROXIMITY_THRESHOLD = 10
export const M42_FACTION_BALANCE_EDICT_DURATION_MONTHS = 6
export const M42_FACTION_REFORM_BLOCK_THRESHOLD = 70
export const M42_AI_DISASTER_RELIEF_PROPENSITY: Record<string, string> = {
  benevolent: 'open_granary',
  steward: 'reduce_tax',
  tyrant: 'forced_levy',
  conqueror: 'ignore',
  incompetent: 'ignore',
  builder: 'open_granary',
  learned: 'reduce_tax',
  schemer: 'reduce_tax',
}
