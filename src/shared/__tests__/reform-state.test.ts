import { describe, it, expect } from 'vitest'
import { ReformStateSchema } from '../schemas'
import { makeEmptyWorld } from './fixtures'
import type { ReformState } from '../types'

const validReformState: ReformState = {
  realmId: 'realm_qin',
  reformId: 'reform_shang_yang',
  currentStageId: 'stage_proposal',
  startedAtTick: 100,
  stageEnteredAtTick: 100,
  status: 'in_progress',
  choiceHistory: [],
}

describe('ReformStateSchema', () => {
  it('accepts a minimal valid ReformState', () => {
    const result = ReformStateSchema.safeParse(validReformState)
    expect(result.success).toBe(true)
  })

  it('accepts ReformState with non-empty choiceHistory', () => {
    const stateWithHistory: ReformState = {
      ...validReformState,
      choiceHistory: [
        { stageId: 'stage_proposal', choiceId: 'accept', tick: 105 },
        { stageId: 'stage_implementation', choiceId: 'reject', tick: 110 },
      ],
    }
    const result = ReformStateSchema.safeParse(stateWithHistory)
    expect(result.success).toBe(true)
  })

  it('accepts every valid status value', () => {
    const statuses: ReformState['status'][] = [
      'in_progress',
      'completed_success',
      'completed_failure',
      'paused',
    ]
    for (const status of statuses) {
      const result = ReformStateSchema.safeParse({ ...validReformState, status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects ReformState with invalid status', () => {
    const result = ReformStateSchema.safeParse({ ...validReformState, status: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('rejects ReformState with negative startedAtTick', () => {
    const result = ReformStateSchema.safeParse({ ...validReformState, startedAtTick: -1 })
    expect(result.success).toBe(false)
  })
})

describe('World.reformStates', () => {
  it('exists as an empty Map in default world fixture', () => {
    const world = makeEmptyWorld()
    expect(world.reformStates).toBeInstanceOf(Map)
    expect(world.reformStates.size).toBe(0)
  })

  it('can hold multiple ReformState entries keyed by realmId', () => {
    const a: ReformState = { ...validReformState, realmId: 'realm_qin' }
    const b: ReformState = { ...validReformState, realmId: 'realm_chu', reformId: 'reform_other' }
    const world = makeEmptyWorld({
      reformStates: new Map([
        ['realm_qin', a],
        ['realm_chu', b],
      ]),
    })
    expect(world.reformStates.size).toBe(2)
    expect(world.reformStates.get('realm_qin')?.reformId).toBe('reform_shang_yang')
    expect(world.reformStates.get('realm_chu')?.reformId).toBe('reform_other')
  })
})
