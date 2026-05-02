import { describe, expect, it } from 'vitest'

import { historicalEventsPhase } from '../event-chain-engine'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { EventChainState, GameDate, RNGState } from '~/shared/types'

const rng: RNGState = { seed: 42, counter: 0 }

describe('historicalEventsPhase — real implementation', () => {
  it('triggers lin_xiangru chain when date is in 280-278 range', () => {
    const date: GameDate = { yearBC: 279, season: 'spring', month: 1, xun: 'shang' }
    const world = makeEmptyWorld({ date })

    const result = historicalEventsPhase(world, rng)

    expect(result.world.eventChainStates.has('event_lin_xiangru_bi')).toBe(true)
    expect(result.events.some((e) => e.type === 'eventChainTriggered')).toBe(true)
  })

  it('does not trigger any chain when date is outside all ranges', () => {
    const date: GameDate = { yearBC: 400, season: 'spring', month: 1, xun: 'shang' }
    const world = makeEmptyWorld({ date })

    const result = historicalEventsPhase(world, rng)

    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })

  it('respects oneShot: chain not triggered twice', () => {
    const date: GameDate = { yearBC: 279, season: 'spring', month: 1, xun: 'shang' }
    const existingState: EventChainState = {
      id: 'event_lin_xiangru_bi',
      currentStageId: 'stage1',
      completed: false,
      startedAtTick: 0,
      choiceHistory: [],
    }
    const eventChainStates = new Map([['event_lin_xiangru_bi', existingState]])
    const world = makeEmptyWorld({ date, eventChainStates })

    const result = historicalEventsPhase(world, rng)

    expect(result.events.find((e) => {
      const payload = e.payload as { chainId?: string }
      return e.type === 'eventChainTriggered' && payload.chainId === 'event_lin_xiangru_bi'
    })).toBeUndefined()
  })

  it('emits eventChainTriggered event with chainId payload', () => {
    const date: GameDate = { yearBC: 279, season: 'spring', month: 1, xun: 'shang' }
    const world = makeEmptyWorld({ date })

    const result = historicalEventsPhase(world, rng)

    const triggered = result.events.find((e) => e.type === 'eventChainTriggered')
    expect(triggered).toBeDefined()
    const payload = triggered!.payload as { chainId: string }
    expect(payload.chainId).toBe('event_lin_xiangru_bi')
  })

  it('creates EventChainState pointing to first stage', () => {
    const date: GameDate = { yearBC: 279, season: 'spring', month: 1, xun: 'shang' }
    const world = makeEmptyWorld({ date, tick: 100 })

    const result = historicalEventsPhase(world, rng)

    const state = result.world.eventChainStates.get('event_lin_xiangru_bi')
    expect(state).toBeDefined()
    expect(state?.currentStageId).toBe('stage1')
    expect(state?.completed).toBe(false)
    expect(state?.startedAtTick).toBe(100)
    expect(state?.choiceHistory).toEqual([])
  })

  it('triggers fan_ju chain when date is 266 (within 268-264)', () => {
    const date: GameDate = { yearBC: 266, season: 'spring', month: 1, xun: 'shang' }
    const world = makeEmptyWorld({ date })

    const result = historicalEventsPhase(world, rng)

    expect(result.world.eventChainStates.has('event_fan_ju_strategy')).toBe(true)
  })

  it('triggers lian_po chain when date is 260 (within 261-258)', () => {
    const date: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
    const world = makeEmptyWorld({ date })

    const result = historicalEventsPhase(world, rng)

    expect(result.world.eventChainStates.has('event_lian_po_elder')).toBe(true)
  })

  it('does not consume RNG (returns same reference)', () => {
    const date: GameDate = { yearBC: 279, season: 'spring', month: 1, xun: 'shang' }
    const world = makeEmptyWorld({ date })

    const result = historicalEventsPhase(world, rng)

    expect(result.nextRng).toBe(rng)
  })
})
