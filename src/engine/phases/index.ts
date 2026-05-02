export const PHASE_NAMES = {
  AI_PLAN: 'aiPlan',
  ORDER_APPLY: 'orderApply',
  MARCH: 'march',
  SIEGE: 'siege',
  COMBAT_V2: 'combat-v2',
  MANPOWER: 'manpower',
  RULER_LIFECYCLE: 'rulerLifecycle',
  CHARACTER_LIFECYCLE: 'characterLifecycle',
  RECRUITMENT: 'recruitment',
  REFORM: 'reform',
  VICTORY_CHECK: 'victoryCheck',
  DIPLOMACY_LIFECYCLE: 'diplomacyLifecycle',
  ECONOMY: 'economy',
  DISASTER: 'disaster',
  TRADE: 'trade',
  FACTION: 'faction',
  HISTORICAL_EVENTS: 'historicalEvents',
} as const

export const PHASE_ORDER: readonly string[] = [
  PHASE_NAMES.AI_PLAN,
  PHASE_NAMES.ORDER_APPLY,
  PHASE_NAMES.MARCH,
  PHASE_NAMES.SIEGE,
  PHASE_NAMES.COMBAT_V2,
  PHASE_NAMES.MANPOWER,
  PHASE_NAMES.RULER_LIFECYCLE,
  PHASE_NAMES.CHARACTER_LIFECYCLE,
  PHASE_NAMES.RECRUITMENT,
  PHASE_NAMES.REFORM,
  PHASE_NAMES.VICTORY_CHECK,
  PHASE_NAMES.DIPLOMACY_LIFECYCLE,
  PHASE_NAMES.ECONOMY,
  PHASE_NAMES.DISASTER,
  PHASE_NAMES.TRADE,
  PHASE_NAMES.FACTION,
  PHASE_NAMES.HISTORICAL_EVENTS,
]

// Legacy phase name (kept for reference/regression testing)
export const LEGACY_COMBAT = 'combat'
