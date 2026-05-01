import {
  DEFAULT_TRAVEL_COST,
  FRIENDLY_PASS_TRAVEL_MULTIPLIER,
  TERRAIN_TRAVEL_COST,
} from '~/content/m2/balance'
import type { GameEvent, RNGState, SiteId, World } from '~/shared/types'

/**
 * Compute march ticks from a MapEdge travel_cost and speed factor.
 * M1: speedFactor = 1 (no speed bonuses)
 */
export function computeMarchTicks(travelCost: number, speedFactor = 1): number {
  return Math.max(1, Math.ceil(travelCost / speedFactor))
}

export function findTravelCost(world: World, fromSiteId: SiteId, toSiteId: SiteId, realmId?: string): number {
  const fromSite = world.sites.get(fromSiteId)
  const toSite = world.sites.get(toSiteId)
  if (!fromSite || !toSite) return DEFAULT_TRAVEL_COST

  let baseCost = DEFAULT_TRAVEL_COST
  const fromEdgeIds = new Set(fromSite.boundary.map(ref => ref.edge))
  for (const ref of toSite.boundary) {
    if (fromEdgeIds.has(ref.edge)) {
      baseCost = world.edges.get(ref.edge)?.travel_cost ?? DEFAULT_TRAVEL_COST
      break
    }
  }

  const terrainMultiplier = TERRAIN_TRAVEL_COST[toSite.terrainType ?? 'plains'] ?? 1.0

  let passMultiplier = 1.0
  if (realmId) {
    for (const ae of world.adjacencyEdges.values()) {
      if (
        (ae.fromSiteId === fromSiteId && ae.toSiteId === toSiteId) ||
        (ae.fromSiteId === toSiteId && ae.toSiteId === fromSiteId)
        ) {
          const pass = world.passes.get(ae.passId)
          if (pass && pass.controllerId === realmId) {
            passMultiplier = FRIENDLY_PASS_TRAVEL_MULTIPLIER
          }
          break
        }
    }
  }

  return Math.ceil(baseCost * terrainMultiplier * passMultiplier)
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
