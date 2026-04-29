import { describe, expect, it } from 'vitest'
import { createInitialRng, nextInt, nextRng, pickRandom } from '../index'

const seedA = 123456789
const seedB = 987654321
const baseStateA = createInitialRng(seedA)
const baseStateB = createInitialRng(seedB)

describe('nextRng determinism', () => {
  it('same input gives same value', () => {
    const a = nextRng(baseStateA)
    const b = nextRng(baseStateA)
    expect(a.value).toBe(b.value)
    expect(a.nextState).toEqual(b.nextState)
  })

  it('increments counter by 1', () => {
    const { nextState } = nextRng(baseStateA)
    expect(nextState.counter).toBe(baseStateA.counter + 1)
  })
})

describe('nextRng sequence', () => {
  it('runs 1000 times, counter reaches 1000', () => {
    let state = baseStateA
    for (let i = 0; i < 1000; i += 1) {
      state = nextRng(state).nextState
    }
    expect(state.counter).toBe(1000)
  })

  it('different seeds produce different sequences', () => {
    const seqA: number[] = []
    const seqB: number[] = []
    let stateA = baseStateA
    let stateB = baseStateB
    for (let i = 0; i < 5; i += 1) {
      const nextA = nextRng(stateA)
      const nextB = nextRng(stateB)
      seqA.push(nextA.value)
      seqB.push(nextB.value)
      stateA = nextA.nextState
      stateB = nextB.nextState
    }
    expect(seqA).not.toEqual(seqB)
  })
})

describe('nextInt', () => {
  it('returns values within [min, max] over 1000 calls', () => {
    let state = baseStateA
    for (let i = 0; i < 1000; i += 1) {
      const result = nextInt(state, 3, 9)
      expect(result.value).toBeGreaterThanOrEqual(3)
      expect(result.value).toBeLessThanOrEqual(9)
      state = result.nextState
    }
  })
})

describe('pickRandom', () => {
  it('returns undefined for empty array', () => {
    const result = pickRandom(baseStateA, [])
    expect(result.value).toBeUndefined()
    expect(result.nextState).toEqual(baseStateA)
  })

  it('returns the element for single-element array', () => {
    const result = pickRandom(baseStateA, ['only'])
    expect(result.value).toBe('only')
    expect(result.nextState.counter).toBe(baseStateA.counter + 1)
  })
})
