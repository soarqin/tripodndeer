import { enableMapSet } from 'immer'

import type { GameEvent, RNGState, SpeedTier, World } from '@/shared/types'
import { TICK_INTERVAL_MS } from '@/shared/constants'
import { addOneTick } from '@/engine/date/calendar'

enableMapSet()

export interface ClockState {
  speed: SpeedTier
  realTimeAccum: number
}

export function runTickPhases(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: GameEvent[] } {
  let currentWorld = world
  let currentRng = rng
  const allEvents: GameEvent[] = []

  for (const phase of world.phases) {
    const result = phase(currentWorld, currentRng)
    currentWorld = result.world
    currentRng = result.nextRng
    allEvents.push(...result.events)
  }

  const nextWorld: World = {
    ...currentWorld,
    tick: currentWorld.tick + 1,
    date: addOneTick(currentWorld.date),
    rngState: currentRng,
  }

  return { world: nextWorld, nextRng: currentRng, events: allEvents }
}

export function advanceClock(
  state: ClockState,
  deltaMs: number,
  world: World,
): { clockState: ClockState; nextWorld: World; events: GameEvent[] } {
  if (state.speed === 'pause') return { clockState: state, nextWorld: world, events: [] }

  const interval = TICK_INTERVAL_MS[state.speed]
  let accum = state.realTimeAccum + deltaMs
  let currentWorld = world
  const allEvents: GameEvent[] = []

  while (accum >= interval) {
    accum -= interval
    const result = runTickPhases(currentWorld, currentWorld.rngState)
    currentWorld = result.world
    allEvents.push(...result.events)
  }

  return {
    clockState: { speed: state.speed, realTimeAccum: accum },
    nextWorld: currentWorld,
    events: allEvents,
  }
}

export function setSpeed(state: ClockState, speed: SpeedTier): ClockState {
  return { speed, realTimeAccum: 0 }
}
