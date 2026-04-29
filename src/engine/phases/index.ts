export const PHASE_NAMES = {
  AI_PLAN: 'aiPlan',
  ORDER_APPLY: 'orderApply',
  MARCH: 'march',
  COMBAT: 'combat',
  VICTORY_CHECK: 'victoryCheck',
} as const

export const PHASE_ORDER: readonly string[] = [
  PHASE_NAMES.AI_PLAN,
  PHASE_NAMES.ORDER_APPLY,
  PHASE_NAMES.MARCH,
  PHASE_NAMES.COMBAT,
  PHASE_NAMES.VICTORY_CHECK,
]
