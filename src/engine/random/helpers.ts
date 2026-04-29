import type { RNGState } from '@/shared/types'
import { nextRng } from './mulberry32'

/** 创建初始 RNG 状态（counter 从 0 开始） */
export function createInitialRng(seed: number): RNGState {
  return { seed, counter: 0 }
}

/** 返回 [min, max] 范围内的随机整数（包含两端） */
export function nextInt(
  state: RNGState,
  min: number,
  max: number,
): { value: number; nextState: RNGState } {
  const { value, nextState } = nextRng(state)
  return {
    value: Math.floor(value * (max - min + 1)) + min,
    nextState,
  }
}

/** 从数组中随机取一个元素。空数组返回 undefined。 */
export function pickRandom<T>(
  state: RNGState,
  arr: readonly T[],
): { value: T | undefined; nextState: RNGState } {
  if (arr.length === 0) {
    return { value: undefined, nextState: state }
  }
  const { value: idx, nextState } = nextInt(state, 0, arr.length - 1)
  return { value: arr[idx], nextState }
}
