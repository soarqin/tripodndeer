import type { Army, GameEvent, General, GeneralId, RNGState, Site, World } from '~/shared/types'
import { resolveCombat } from './combat-v2'
import type { BattleContext, Composition } from './combat-v2'

const DEFAULT_COMPOSITION: Composition = { infantry: 1, chariot: 0, cavalry: 0, crossbow: 0 }

type TerrainSite = Site & { terrainType?: BattleContext['terrain'] }

function findDefenders(
  armies: ReadonlyMap<string, Army>,
  attacker: Army,
  destination: string,
  destinationOwner: string | null,
): Army[] {
  return [...armies.values()].filter(
    (candidate) =>
      candidate.id !== attacker.id &&
      candidate.location === destination &&
      candidate.realmId === destinationOwner,
  )
}

function applyGeneralDeaths(
  armies: Map<string, Army>,
  generals: ReadonlyMap<GeneralId, General>,
  deadGeneralIds: readonly GeneralId[],
  battleSiteId: string,
  events: GameEvent[],
): ReadonlyMap<GeneralId, General> {
  let nextGenerals = new Map(generals)

  for (const deadGeneralId of deadGeneralIds) {
    const deadGeneral = nextGenerals.get(deadGeneralId)
    if (!deadGeneral) continue

    nextGenerals.delete(deadGeneralId)

    const army = [...armies.values()].find((candidate) => candidate.generalId === deadGeneralId)
    if (army) armies.set(army.id, { ...army, generalId: undefined })

    events.push({
      type: 'generalDied',
      payload: {
        generalId: deadGeneralId,
        generalName: deadGeneral.name,
        realmId: deadGeneral.realmId,
        battleSiteId,
      },
    })
  }

  return nextGenerals
}

export function combatV2Step(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  const sites = new Map(world.sites)
  const armies = new Map(world.armies)
  let generals = world.generals

  for (const army of world.armies.values()) {
    if (army.state !== 'marching' || army.ticksRemaining !== 0) continue
    if (!army.destination) continue

    const destination = army.destination
    const destSite = sites.get(destination)
    if (!destSite) continue

    const defenders = findDefenders(armies, army, destination, destSite.ownerId)
    const attackerGeneral = army.generalId ? generals.get(army.generalId) ?? null : null
    const defenderGeneral = defenders[0]?.generalId ? generals.get(defenders[0].generalId) ?? null : null

    const ctx: BattleContext = {
      attackerArmy: army,
      defenderArmies: defenders,
      attackerGeneral,
      defenderGeneral,
      terrain: (destSite as TerrainSite).terrainType ?? 'plains',
      battleType: 'field',
      passDefenseBonus: 0,
      siegeBonus: 0,
      attackerComposition: army.composition ?? DEFAULT_COMPOSITION,
      defenderComposition: defenders[0]?.composition ?? DEFAULT_COMPOSITION,
      date: world.date,
    }

    const result = resolveCombat(ctx)
    generals = applyGeneralDeaths(armies, generals, result.deadGenerals, destination, events)
    const currentAttacker = armies.get(army.id) ?? army

    if (result.winner === 'attacker') {
      armies.set(currentAttacker.id, {
        ...currentAttacker,
        location: destination,
        state: 'idle',
        destination: null,
        ticksRemaining: 0,
        source: null,
        manpower: Math.max(0, currentAttacker.manpower - result.attackerLoss),
      })
      for (const defender of defenders) armies.delete(defender.id)

      const prevOwner = destSite.ownerId
      sites.set(destination, { ...destSite, ownerId: currentAttacker.realmId })
      events.push({
        type: 'siteConquered',
        payload: { siteId: destination, byRealm: currentAttacker.realmId, fromRealm: prevOwner },
      })
    } else {
      if (!currentAttacker.source) {
        armies.delete(currentAttacker.id)
      } else {
        armies.set(currentAttacker.id, {
          ...currentAttacker,
          state: 'retreating',
          destination: currentAttacker.source,
          ticksRemaining: 3,
          manpower: Math.max(0, currentAttacker.manpower - result.attackerLoss),
        })
      }
      events.push({ type: 'battleLost', payload: { armyId: currentAttacker.id, atSite: destination } })
    }
  }

  return { world: { ...world, sites, armies, generals }, nextRng: rng, events }
}
