import { resolveCombat } from '~/engine/systems/combat-v2'
import type { BattleContext, Composition } from '~/engine/systems/combat-v2'
import type {
  Army,
  ArmyId,
  GameEvent,
  RNGState,
  Siege,
  SiegeId,
  Site,
  SiteId,
  World,
} from '~/shared/types'

const DEFAULT_COMPOSITION: Composition = { infantry: 1, chariot: 0, cavalry: 0, crossbow: 0 }

/** Per-tick fortification damage during siege */
const FORTIFICATION_DECAY_PER_TICK = 5

/** Per-tick supply consumption during siege */
const SUPPLY_DECAY_PER_TICK = 2

/** Initial fortification at siege start */
const INITIAL_FORTIFICATION = 100

/** Initial supply at siege start (in tick-equivalents) */
const INITIAL_SUPPLY = 20

/** Threshold below which a starvation event is emitted */
const STARVATION_WARNING_THRESHOLD = 5

/** Threshold below which a wallBreach event is emitted (only on the tick we cross it) */
const WALL_BREACH_WARNING_THRESHOLD = 20

/** Defensive bonus the besieged settlement enjoys during the final assault */
const SIEGE_ASSAULT_DEFENSE_BONUS = 0.3

type TerrainSite = Site & { terrainType?: BattleContext['terrain'] }

function pickFirstAttacker(
  attackerArmyIds: readonly ArmyId[],
  armies: ReadonlyMap<ArmyId, Army>,
): Army | null {
  for (const id of attackerArmyIds) {
    const army = armies.get(id)
    if (army) return army
  }
  return null
}

function findDefendingArmies(
  armies: ReadonlyMap<ArmyId, Army>,
  siteId: SiteId,
  defenderRealmId: string | null,
): Army[] {
  if (!defenderRealmId) return []
  return [...armies.values()].filter(
    (a) => a.location === siteId && a.realmId === defenderRealmId,
  )
}

export function siegeStep(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  const sieges = new Map(world.sieges)
  const sites = new Map(world.sites)
  const armies = new Map(world.armies)

  for (const [siegeId, siege] of world.sieges) {
    // Retreat check first: if all attacker armies are gone or in 'retreating' state, end siege
    const allRetreating = siege.attackerArmyIds.every((id) => {
      const army = armies.get(id)
      return !army || army.state === 'retreating'
    })
    if (allRetreating) {
      events.push({
        type: 'siegeEnded',
        payload: { siegeId, siteId: siege.defenderSiteId, outcome: 'retreat' },
      })
      sieges.delete(siegeId)
      continue
    }

    const newDuration = siege.durationTicks + 1
    const newFortification = Math.max(0, siege.fortification - FORTIFICATION_DECAY_PER_TICK)
    const newSupply = Math.max(0, siege.supplyRemaining - SUPPLY_DECAY_PER_TICK)

    // Supply exhaustion → defender forced to surrender
    if (newSupply === 0) {
      const site = sites.get(siege.defenderSiteId)
      const attacker = pickFirstAttacker(siege.attackerArmyIds, armies)
      if (site && attacker) {
        const fromRealm = site.ownerId
        sites.set(siege.defenderSiteId, {
          ...site,
          ownerId: attacker.realmId,
          occupation: { occupierId: attacker.realmId, controlLevel: 100 },
        })
        armies.set(attacker.id, {
          ...attacker,
          state: 'idle',
          destination: null,
          ticksRemaining: 0,
          source: null,
          location: siege.defenderSiteId,
        })
        events.push({
          type: 'siteConquered',
          payload: {
            siteId: siege.defenderSiteId,
            byRealm: attacker.realmId,
            fromRealm,
            reason: 'starvation',
          },
        })
        events.push({
          type: 'siegeEnded',
          payload: { siegeId, siteId: siege.defenderSiteId, outcome: 'starvation' },
        })
      }
      sieges.delete(siegeId)
      continue
    }

    // Fortification breached → resolve final assault via combat-v2
    if (newFortification === 0) {
      const site = sites.get(siege.defenderSiteId)
      const attacker = pickFirstAttacker(siege.attackerArmyIds, armies)
      if (site && attacker) {
        const defenders = findDefendingArmies(armies, siege.defenderSiteId, site.ownerId)
        const defenderRealmId = defenders[0]?.realmId ?? site.ownerId
        const ctx: BattleContext = {
          attackerArmy: attacker,
          defenderArmies: defenders,
          attackerGeneral: attacker.generalId
            ? world.generals.get(attacker.generalId) ?? null
            : null,
          defenderGeneral: defenders[0]?.generalId
            ? world.generals.get(defenders[0].generalId) ?? null
            : null,
          terrain: (site as TerrainSite).terrainType ?? 'plains',
          battleType: 'siege-assault',
          passDefenseBonus: 0,
          siegeBonus: SIEGE_ASSAULT_DEFENSE_BONUS,
          attackerComposition: attacker.composition ?? DEFAULT_COMPOSITION,
          defenderComposition: defenders[0]?.composition ?? DEFAULT_COMPOSITION,
          date: world.date,
          attackerRealm: world.realms.get(attacker.realmId) ?? null,
          defenderRealm: defenderRealmId ? world.realms.get(defenderRealmId) ?? null : null,
        }
        const result = resolveCombat(ctx)

        if (result.winner === 'attacker') {
          const fromRealm = site.ownerId
          sites.set(siege.defenderSiteId, {
            ...site,
            ownerId: attacker.realmId,
            occupation: { occupierId: attacker.realmId, controlLevel: 100 },
          })
          armies.set(attacker.id, {
            ...attacker,
            state: 'idle',
            destination: null,
            ticksRemaining: 0,
            source: null,
            location: siege.defenderSiteId,
            manpower: Math.max(0, attacker.manpower - result.attackerLoss),
          })
          for (const defender of defenders) armies.delete(defender.id)
          events.push({
            type: 'siteConquered',
            payload: {
              siteId: siege.defenderSiteId,
              byRealm: attacker.realmId,
              fromRealm,
              reason: 'breach',
            },
          })
        } else {
          armies.set(attacker.id, {
            ...attacker,
            manpower: Math.max(0, attacker.manpower - result.attackerLoss),
            state: 'retreating',
            destination: attacker.source ?? attacker.location,
            ticksRemaining: 3,
          })
        }

        events.push({
          type: 'siegeEnded',
          payload: { siegeId, siteId: siege.defenderSiteId, outcome: result.winner },
        })
      }
      sieges.delete(siegeId)
      continue
    }

    // Periodic warning events
    if (newSupply <= STARVATION_WARNING_THRESHOLD) {
      events.push({
        type: 'siegeStarvation',
        payload: { siegeId, supplyRemaining: newSupply },
      })
    }
    if (
      newFortification < WALL_BREACH_WARNING_THRESHOLD &&
      siege.fortification >= WALL_BREACH_WARNING_THRESHOLD
    ) {
      events.push({
        type: 'wallBreach',
        payload: { siegeId, fortification: newFortification },
      })
    }

    sieges.set(siegeId, {
      ...siege,
      durationTicks: newDuration,
      fortification: newFortification,
      supplyRemaining: newSupply,
    })
  }

  return { world: { ...world, sieges, sites, armies }, nextRng: rng, events }
}

export function startSiege(
  world: World,
  attackerArmyId: ArmyId,
  defenderSiteId: SiteId,
): World {
  const siegeId: SiegeId = `siege_${attackerArmyId}_${defenderSiteId}`
  const attacker = world.armies.get(attackerArmyId)
  const site = world.sites.get(defenderSiteId)

  const siege: Siege = {
    id: siegeId,
    attackerArmyIds: [attackerArmyId],
    defenderSiteId,
    startedAt: world.date,
    durationTicks: 0,
    fortification: INITIAL_FORTIFICATION,
    supplyRemaining: INITIAL_SUPPLY,
  }

  const sites = new Map(world.sites)
  if (site && attacker) {
    sites.set(defenderSiteId, {
      ...site,
      occupation: { occupierId: attacker.realmId, controlLevel: 0 },
    })
  }

  const sieges = new Map(world.sieges)
  sieges.set(siegeId, siege)

  const armies = new Map(world.armies)
  if (attacker) {
    armies.set(attackerArmyId, {
      ...attacker,
      state: 'besieging',
      location: defenderSiteId,
      destination: null,
      ticksRemaining: 0,
    })
  }

  return { ...world, sieges, sites, armies }
}
