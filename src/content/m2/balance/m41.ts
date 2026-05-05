// === M4.1 Reform System ===
export const M41_AI_REFORM_CHECK_INTERVAL_TICKS = 36

export const M41_AI_PERSONALITY_REFORM_PROPENSITY: Record<string, number> = {
  builder: 0.40,
  conqueror: 0.25,
  schemer: 0.18,
  tyrant: 0.15,
  learned: 0.12,
  steward: 0.08,
  benevolent: 0.05,
  incompetent: 0.02,
}

export const M41_REFORM_FAILURE_TREASURY_LOSS = 2000
export const M41_REFORM_FAILURE_COOLDOWN_YEARS = 10
export const M41_REFORM_FAILED_SCAR_TRAIT = 'reform_failed_scar'
export const M41_REFORMS_COUNT = 4
export const M41_REFORM_TRAIT_DIMENSIONS_COUNT = 6
export const M41_REFORM_PREDICATE_KINDS_COUNT = 12
export const M41_REFORMER_GRACE_PERIOD_YEARS = 2
export const M41_REFORM_STAGE_LIMIT = 5

export const M41_PRE_APPLIED_TRAITS: Record<string, readonly string[]> = {
  realm_qin: ['shang_yang_reform_done'],
  realm_zhao: ['hu_fu_qi_she_done'],
  realm_chu: ['wu_qi_failed_legacy'],
  realm_wei: ['li_kui_reform_done'],
}

export const M41_PRE_APPLIED_POLITICAL_SYSTEMS: Record<string, string> = {
  realm_qin: 'legalist_centralized',
  realm_zhao: 'commandery',
  realm_wei: 'commandery',
  realm_chu: 'enfeoffment',
}
