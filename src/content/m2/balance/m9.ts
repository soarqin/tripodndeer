// ─── M9 Warring States Content ──────────────────────────────────────────────

export const M9_ENABLED = true
export const M9_SCENARIO_VERSION = 8
export const M9_DEFAULT_SCENARIO_PATH = 'src/content/m9/scenario-453bc.json'
export const M9_LEGACY_SCENARIO_PATH = 'src/content/m1/scenario.json'
export const M9_SITE_COUNT = 250
export const M9_REALM_COUNT = 12
export const M9_PLAYABLE_REALMS = [
  'realm_qin',
  'realm_chu',
  'realm_qi',
  'realm_yan',
  'realm_han',
  'realm_zhao',
  'realm_wei',
  'realm_zhou',
] as const
export const M9_AI_ONLY_REALMS = [
  'realm_yue',
  'realm_song',
  'realm_lu',
  'realm_zhongshan',
] as const
export const M9_PROVINCE_COUNT_TARGET = { min: 30, max: 40 } as const
export const M9_REGION_COUNT = 9
export const M9_PASS_COUNT_TARGET = { min: 18, max: 20 } as const
export const M9_CHARACTER_TEMPLATE_COUNT = 90
export const M9_NAME_POOL_SIZE = 400
export const M9_EVENT_CHAIN_COUNT_NEW = 26
export const M9_EVENT_CHAIN_COUNT_TOTAL = 36
export const M9_SCENARIO_START_YEAR_BC = 453
export const M9_SCENARIO_END_YEAR_BC = 221
export const M9_HISTORICAL_FIDELITY_TIER = 1
export const M9_ESTIMATED_AGE_AT_APPEARANCE = 20
export const M9_REALM_DEACTIVATION_HISTORICAL_YEARS: Record<string, number> = {
  realm_yue: 334,
  realm_zhongshan: 296,
  realm_zhou: 256,
  realm_han: 230,
  realm_zhao: 228,
  realm_wei: 225,
  realm_chu: 223,
  realm_yan: 222,
  realm_qi: 221,
}
export const M9_FORBIDDEN_ANACHRONISM_STRINGS = [
  '皇帝',
  '火药',
  '马镫',
  '独尊儒术',
  '宋词',
  '造纸',
  '马凯铁骑',
] as const
