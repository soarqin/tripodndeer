import { describe, expect, it } from 'vitest'
import type { AIOption } from '../index'
import { pickAction, scoreOption } from '../index'

describe('utility scorer', () => {
  it('conqueror: attack scores higher than retreat', () => {
    const options: AIOption[] = [
      { kind: 'attack', score: 10 },
      { kind: 'retreat', score: 10 },
    ]

    const { action } = pickAction(options, 'conqueror', {
      seed: 42,
      counter: 0,
    })

    expect(action.kind).toBe('attack')
  })

  it('steward: economy scores higher than attack', () => {
    const attackScore = scoreOption({ kind: 'attack', score: 10 }, 'steward')
    const economyScore = scoreOption({ kind: 'economy', score: 10 }, 'steward')

    expect(economyScore).toBeGreaterThan(attackScore)
  })

  it('tyrant: attack scores highest', () => {
    const attackScore = scoreOption({ kind: 'attack', score: 10 }, 'tyrant')
    const retreatScore = scoreOption({ kind: 'retreat', score: 10 }, 'tyrant')
    const diplomacyScore = scoreOption(
      { kind: 'diplomacy', score: 10 },
      'tyrant'
    )

    expect(attackScore).toBeGreaterThan(retreatScore)
    expect(attackScore).toBeGreaterThan(diplomacyScore)
  })

  it('benevolent: diplomacy/economy scores higher than attack', () => {
    const attackScore = scoreOption({ kind: 'attack', score: 10 }, 'benevolent')
    const diplomacyScore = scoreOption(
      { kind: 'diplomacy', score: 10 },
      'benevolent'
    )
    const economyScore = scoreOption(
      { kind: 'economy', score: 10 },
      'benevolent'
    )

    expect(diplomacyScore).toBeGreaterThan(attackScore)
    expect(economyScore).toBeGreaterThan(attackScore)
  })

  it('deterministic with same seed', () => {
    const options: AIOption[] = [
      { kind: 'attack', score: 0 },
      { kind: 'idle', score: 0 },
    ]

    const { action: a1 } = pickAction(options, 'conqueror', {
      seed: 99,
      counter: 0,
    })
    const { action: a2 } = pickAction(options, 'conqueror', {
      seed: 99,
      counter: 0,
    })

    expect(a1.kind).toBe(a2.kind)
  })
})
