import type { RNGState } from '@/shared/types'

/**
 * Mulberry32 PRNG 核心实现。
 * 纯函数：输入 state → 输出 { value, nextState }，无任何副作用。
 * CRITICAL: 不暴露任何 module-level 可变状态。
 */
export function nextRng(state: RNGState): { value: number; nextState: RNGState } {
  let t = (state.seed + state.counter * 0x6D2B79F5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return {
    value,
    nextState: { seed: state.seed, counter: state.counter + 1 },
  }
}
