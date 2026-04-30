import { describe, expect, it } from 'vitest'
import type { AIOption } from '../index'
import { getPersonality, pickAction, scoreOption } from '../index'

describe('utility scorer', () => {
  it('cautious: retreat scores higher than attack with equal base scores', () => {
    const options: AIOption[] = [
      { kind: 'attack', score: 0 },
      { kind: 'retreat', score: 0 },
    ]

    const { action } = pickAction(options, 'cautious', { seed: 42, counter: 0 })

    expect(action.kind).toBe('retreat')
  })

  it('aggressive: attack scores higher than retreat', () => {
    const options: AIOption[] = [
      { kind: 'attack', score: 0 },
      { kind: 'retreat', score: 0 },
    ]

    const { action } = pickAction(options, 'aggressive', { seed: 42, counter: 0 })

    expect(action.kind).toBe('attack')
  })

  it('deterministic with same seed', () => {
    const options: AIOption[] = [
      { kind: 'attack', score: 0 },
      { kind: 'idle', score: 0 },
    ]

    const { action: a1 } = pickAction(options, 'aggressive', { seed: 99, counter: 0 })
    const { action: a2 } = pickAction(options, 'aggressive', { seed: 99, counter: 0 })

    expect(a1.kind).toBe(a2.kind)
  })

  it('combines personality weights with option scores', () => {
    expect(scoreOption({ kind: 'attack', score: 50 }, 'cautious')).toBe(40)
    expect(scoreOption({ kind: 'retreat', score: 0 }, 'cautious')).toBe(20)
  })

  it('derives personality deterministically from realm id', () => {
    expect(getPersonality('realm_ai')).toBe(getPersonality('realm_ai'))
  })
})
