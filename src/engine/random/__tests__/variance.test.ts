import { afterEach, describe, expect, it } from 'vitest'
import { pickWithVariance, setCombatVarianceEnabled } from '../variance'

afterEach(() => {
  setCombatVarianceEnabled(false)
})

describe('pickWithVariance', () => {
  it('with variance disabled: always returns exact value', () => {
    setCombatVarianceEnabled(false)
    const rng = { seed: 42, counter: 0 }
    for (let i = 0; i < 100; i += 1) {
      const { result } = pickWithVariance(rng, 100)
      expect(result).toBe(100)
    }
  })

  it('with variance enabled: stays within ±10% range', () => {
    setCombatVarianceEnabled(true)
    let rng = { seed: 42, counter: 0 }
    const results: number[] = []
    for (let i = 0; i < 1000; i += 1) {
      const { result, nextState } = pickWithVariance(rng, 100)
      rng = nextState
      results.push(result)
    }
    const min = Math.min(...results)
    const max = Math.max(...results)
    expect(min).toBeGreaterThanOrEqual(90 - 0.1)
    expect(max).toBeLessThanOrEqual(110 + 0.1)
    expect(results.some(r => r < 95)).toBe(true)
    expect(results.some(r => r > 105)).toBe(true)
  })

  it('advances RNG state when variance is enabled', () => {
    setCombatVarianceEnabled(true)
    const rng = { seed: 42, counter: 0 }
    const { nextState } = pickWithVariance(rng, 100)
    expect(nextState.counter).toBe(1)
  })

  it('does not advance RNG state when variance is disabled', () => {
    setCombatVarianceEnabled(false)
    const rng = { seed: 42, counter: 5 }
    const { nextState } = pickWithVariance(rng, 100)
    expect(nextState.counter).toBe(5)
  })
})
