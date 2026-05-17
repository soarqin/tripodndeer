import type { ScenarioId } from '~/shared/types'

export const M11_SCENARIO_VERSIONS: Record<ScenarioId, string> = {
  m1: '1.0.0',
  m9: '1.0.0',
  tutorial: '1.0.0',
} as const

export const M11_AUTOSAVE_RING_SIZE = 10
export const M11_AUTOSAVE_INTERVAL_TICKS = 100
export const M11_COMPRESSION_TARGET_KB = 50
export const M11_COMPRESSION_SPEED_MS = 100
export const M11_QUOTA_WARN_THRESHOLD_PCT = 80
export const M11_QUOTA_BLOCK_THRESHOLD_PCT = 95
export const M11_QUOTA_CACHE_TTL_MS = 5 * 60 * 1000
export const M11_QUOTA_PRIVATE_FALLBACK_MB = 5
