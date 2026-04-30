import type { RNGState } from '@/shared/types'
import { nextRng } from './mulberry32'

export let COMBAT_VARIANCE_ENABLED =
  typeof process !== 'undefined' ? process.env['VITEST'] !== 'true' : true

export function setCombatVarianceEnabled(enabled: boolean): void {
  COMBAT_VARIANCE_ENABLED = enabled
}

export function pickWithVariance(
  rng: RNGState,
  value: number,
  variance = 0.1,
): { result: number; nextState: RNGState } {
  if (!COMBAT_VARIANCE_ENABLED) {
    return { result: value, nextState: rng }
  }

  const roll = nextRng(rng)
  const factor = 1 + (roll.value * 2 - 1) * variance

  return {
    result: value * factor,
    nextState: roll.nextState,
  }
}
