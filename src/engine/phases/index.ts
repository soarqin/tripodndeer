export const PHASE_NAMES = {
  AI_PLAN: 'aiPlan',
  ORDER_APPLY: 'orderApply',
  MARCH: 'march',
  SIEGE: 'siege',
  COMBAT_V2: 'combat-v2',
  MANPOWER: 'manpower',
  VICTORY_CHECK: 'victoryCheck',
  DIPLOMACY_LIFECYCLE: 'diplomacyLifecycle',
} as const

export const PHASE_ORDER: readonly string[] = [
  PHASE_NAMES.AI_PLAN,
  PHASE_NAMES.ORDER_APPLY,
  PHASE_NAMES.MARCH,
  PHASE_NAMES.SIEGE,
  PHASE_NAMES.COMBAT_V2,
  PHASE_NAMES.MANPOWER,
  PHASE_NAMES.VICTORY_CHECK,
  PHASE_NAMES.DIPLOMACY_LIFECYCLE,
]

// Legacy phase name (kept for reference/regression testing)
export const LEGACY_COMBAT = 'combat'
