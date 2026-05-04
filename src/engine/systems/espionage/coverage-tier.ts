import { M7_COVERAGE_TIER_1, M7_COVERAGE_TIER_2, M7_COVERAGE_TIER_3 } from '~/content/m2/balance'

export type CoverageTier = 'hidden' | 'low' | 'mid' | 'high'

export function getCoverageTier(coverage: number): CoverageTier {
  if (coverage >= M7_COVERAGE_TIER_3) return 'high'
  if (coverage >= M7_COVERAGE_TIER_2) return 'mid'
  if (coverage >= M7_COVERAGE_TIER_1) return 'low'
  return 'hidden'
}
