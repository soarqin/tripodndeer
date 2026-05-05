import { describe, expect, it } from 'vitest'
import { INITIAL_DATE } from '@/shared/constants'
import { makeEmptyWorld } from '@/shared/__tests__/fixtures'
import type { TickPhase, World } from '@/shared/types'
import { advanceClock, runTickPhases, setSpeed } from '../index'

function makeClockWorld(): World {
  return makeEmptyWorld({
    date: { ...INITIAL_DATE },
    playerRealmId: 'realm_red',
    rngState: { seed: 42, counter: 0 },
  })
}

describe('advanceClock pause', () => {
  it('does not advance tick or accumulator while paused', () => {
    const world = makeClockWorld()
    const result = advanceClock({ speed: 'pause', realTimeAccum: 0 }, 10000, world)

    expect(result.clockState.realTimeAccum).toBe(0)
    expect(result.nextWorld.tick).toBe(world.tick)
    expect(result.events).toEqual([])
  })
})

describe('advanceClock intervals', () => {
  it('advances 1x by one tick for 5500ms', () => {
    const result = advanceClock({ speed: '1x', realTimeAccum: 0 }, 5500, makeClockWorld())

    expect(result.nextWorld.tick).toBe(1)
    expect(result.clockState.realTimeAccum).toBe(500)
  })

  it('trusts large deltaMs input without engine-side cap', () => {
    const result = advanceClock({ speed: '5x', realTimeAccum: 0 }, 60000, makeClockWorld())

    expect(result.nextWorld.tick).toBe(150)
    expect(result.clockState.realTimeAccum).toBe(0)
  })
})

describe('setSpeed', () => {
  it('resets accumulated real time when changing speed', () => {
    const result = setSpeed({ speed: '1x', realTimeAccum: 4000 }, '5x')

    expect(result.speed).toBe('5x')
    expect(result.realTimeAccum).toBe(0)
  })
})

describe('runTickPhases', () => {
  it('runs phases in order with chained world and rng', () => {
    const calls: string[] = []
    const firstPhase: TickPhase = (world, rng) => {
      calls.push(`first:${world.tick}:${rng.counter}`)
      return { world: { ...world, tick: 10 }, nextRng: { ...rng, counter: 1 }, events: [] }
    }
    const secondPhase: TickPhase = (world, rng) => {
      calls.push(`second:${world.tick}:${rng.counter}`)
      return { world: { ...world, tick: 20 }, nextRng: { ...rng, counter: 2 }, events: [] }
    }
    const world = { ...makeClockWorld(), phases: [firstPhase, secondPhase] }

    const result = runTickPhases(world, world.rngState)

    expect(calls).toEqual(['first:0:0', 'second:10:1'])
    expect(result.world.tick).toBe(21)
    expect(result.nextRng.counter).toBe(2)
  })
})
