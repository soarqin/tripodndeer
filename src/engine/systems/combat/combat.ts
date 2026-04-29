import type { Army, GameEvent, RNGState, Site, World } from '~/shared/types'

export interface CombatResult {
  readonly winner: 'attacker' | 'defender'
  readonly attackerLoss: number
  readonly defenderLoss: number
}

/**
 * Resolve combat between an attacker and defenders.
 * Defender gets +30% bonus (ceil). Attacker wins only if strictly greater.
 * If no defenders (empty site), attacker wins with 0 losses.
 */
export function resolveCombat(attacker: Army, defenders: readonly Army[]): CombatResult {
  const defenderManpower = defenders.reduce((sum, army) => sum + army.manpower, 0)

  if (defenderManpower === 0) {
    return { winner: 'attacker', attackerLoss: 0, defenderLoss: 0 }
  }

  const defenderEffective = Math.ceil(defenderManpower * 1.3)

  if (attacker.manpower > defenderEffective) {
    return {
      winner: 'attacker',
      attackerLoss: Math.floor(defenderManpower * 0.5),
      defenderLoss: defenderManpower,
    }
  }

  return {
    winner: 'defender',
    attackerLoss: Math.floor(attacker.manpower * 0.3),
    defenderLoss: 0,
  }
}

function findDefenders(armies: ReadonlyMap<string, Army>, army: Army, destinationOwner: string | null): Army[] {
  return [...armies.values()].filter(
    (candidate) =>
      candidate.id !== army.id &&
      candidate.location === army.destination &&
      candidate.realmId === destinationOwner,
  )
}

function applyAttackerWin(
  armies: Map<string, Army>,
  sites: Map<string, Site>,
  army: Army,
  defenders: readonly Army[],
  result: CombatResult,
  events: GameEvent[],
): void {
  const destination = army.destination
  if (!destination) return

  const destSite = sites.get(destination)
  if (!destSite) return

  armies.set(army.id, {
    ...army,
    location: destination,
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
    manpower: army.manpower - result.attackerLoss,
  })

  for (const defender of defenders) armies.delete(defender.id)

  const prevOwner = destSite.ownerId
  sites.set(destination, { ...destSite, ownerId: army.realmId })
  events.push({
    type: 'siteConquered',
    payload: { siteId: destination, byRealm: army.realmId, fromRealm: prevOwner },
  })
}

function applyDefenderWin(
  armies: Map<string, Army>,
  army: Army,
  result: CombatResult,
  events: GameEvent[],
): void {
  if (!army.destination) return

  if (!army.source) {
    armies.delete(army.id)
  } else {
    armies.set(army.id, {
      ...army,
      state: 'retreating',
      destination: army.source,
      ticksRemaining: 3,
      manpower: army.manpower - result.attackerLoss,
    })
  }

  events.push({
    type: 'battleLost',
    payload: { armyId: army.id, atSite: army.destination },
  })
}

/**
 * Combat phase step.
 * Processes all marching armies with ticksRemaining === 0.
 * For each, finds defenders at destination, resolves combat, updates world.
 */
export function combatStep(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  const sites = new Map(world.sites)
  const armies = new Map(world.armies)

  for (const army of world.armies.values()) {
    if (army.state !== 'marching' || army.ticksRemaining !== 0) continue
    if (!army.destination) continue

    const destination = army.destination
    const destSite = sites.get(destination)
    if (!destSite) continue

    const defenders = findDefenders(armies, army, destSite.ownerId)

    const result = resolveCombat(army, defenders)

    if (result.winner === 'attacker') {
      applyAttackerWin(armies, sites, army, defenders, result, events)
    } else {
      applyDefenderWin(armies, army, result, events)
    }
  }

  return {
    world: { ...world, sites, armies },
    nextRng: rng,
    events,
  }
}
