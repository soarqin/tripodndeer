import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../game-store'

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('store tick at 1x speed', () => {
  it('advances world by one tick for 5500ms with 500ms residual accumulator', () => {
    const initial = useGameStore.getState()
    initial.setSpeed('1x')
    initial.tick(5500)

    const next = useGameStore.getState()
    expect(next.world.tick).toBe(1)
    expect(next.clockState.realTimeAccum).toBe(500)
  })
})

describe('store setSpeed', () => {
  it('resets realTimeAccum to 0 and stores new speed when changing speed mid-cycle', () => {
    const store = useGameStore.getState()
    store.setSpeed('1x')
    store.tick(4000)
    expect(useGameStore.getState().clockState.realTimeAccum).toBe(4000)

    useGameStore.getState().setSpeed('5x')
    const after = useGameStore.getState()
    expect(after.clockState.realTimeAccum).toBe(0)
    expect(after.clockState.speed).toBe('5x')
  })
})

describe('store reset', () => {
  it('returns world.tick to 0 and speed to pause after running ticks', () => {
    const store = useGameStore.getState()
    store.setSpeed('5x')
    store.tick(10000)
    expect(useGameStore.getState().world.tick).toBeGreaterThan(0)

    useGameStore.getState().reset()
    const after = useGameStore.getState()
    expect(after.world.tick).toBe(0)
    expect(after.clockState.speed).toBe('pause')
    expect(after.clockState.realTimeAccum).toBe(0)
  })
})

describe('store pause speed', () => {
  it('does not advance world.tick or accumulate time while paused', () => {
    useGameStore.getState().tick(60000)

    const state = useGameStore.getState()
    expect(state.world.tick).toBe(0)
    expect(state.clockState.realTimeAccum).toBe(0)
    expect(state.clockState.speed).toBe('pause')
  })
})

describe('store consecutive ticks', () => {
  it('accumulates partial deltas across multiple tick calls at 1x speed', () => {
    const store = useGameStore.getState()
    store.setSpeed('1x')

    store.tick(2000)
    expect(useGameStore.getState().world.tick).toBe(0)
    expect(useGameStore.getState().clockState.realTimeAccum).toBe(2000)

    useGameStore.getState().tick(3500)
    const after = useGameStore.getState()
    expect(after.world.tick).toBe(1)
    expect(after.clockState.realTimeAccum).toBe(500)
  })
})
