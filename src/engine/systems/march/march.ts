import type { GameEvent, RNGState, World } from '~/shared/types'

/**
 * Compute march ticks from a MapEdge travel_cost and speed factor.
 * M1: speedFactor = 1 (no speed bonuses)
 */
export function computeMarchTicks(travelCost: number, speedFactor = 1): number {
  return Math.max(1, Math.ceil(travelCost / speedFactor))
}

/**
 * March phase step.
 * Decrements ticksRemaining for all marching/retreating armies.
 * When ticksRemaining reaches 0 for a retreating army, completes the retreat.
 * Marching armies with ticksRemaining=0 are left for combatStep to handle.
 */
export function marchStep(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  const armies = new Map(world.armies)

  for (const army of world.armies.values()) {
    if (army.state !== 'marching' && army.state !== 'retreating') continue

    const newTicks = Math.max(0, army.ticksRemaining - 1)

    if (army.state === 'retreating' && newTicks === 0) {
      const updatedArmy = {
        ...army,
        location: army.destination!,
        state: 'idle' as const,
        destination: null,
        ticksRemaining: 0,
        source: null,
      }
      armies.set(army.id, updatedArmy)
      events.push({
        type: 'armyRetreated',
        payload: { armyId: army.id, toSite: updatedArmy.location },
      })
    } else if (army.state === 'marching' && newTicks === 0) {
      armies.set(army.id, { ...army, ticksRemaining: 0 })
    } else {
      armies.set(army.id, { ...army, ticksRemaining: newTicks })
    }
  }

  return { world: { ...world, armies }, nextRng: rng, events }
}
