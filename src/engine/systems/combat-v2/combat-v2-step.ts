import type {
  Academy,
  AcademyId,
  Army,
  DiplomacyEvent,
  GameEvent,
  General,
  GeneralId,
  Pass,
  PassId,
  Realm,
  RealmId,
  RNGState,
  Site,
  SiteId,
  World,
} from '~/shared/types'
import { M6_ENABLED } from '~/content/m2/balance'
import { pushDiplomacyHistory } from '~/engine/systems/diplomacy/history'
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

function isBorderSite(
  sites: ReadonlyMap<SiteId, Site>,
  siteId: SiteId,
  attackerRealmId: RealmId,
  defenderRealmId: RealmId,
): boolean {
  const site = sites.get(siteId)
  if (!site) return false
  let hasAttacker = site.ownerId === attackerRealmId
  let hasDefender = site.ownerId === defenderRealmId
  if (hasAttacker && hasDefender) return true
  for (const neighborId of site.adjacency) {
    const neighbor = sites.get(neighborId)
    if (!neighbor) continue
    if (neighbor.ownerId === attackerRealmId) hasAttacker = true
    if (neighbor.ownerId === defenderRealmId) hasDefender = true
    if (hasAttacker && hasDefender) return true
  }
  return false
}

function findPassOnEdge(world: World, fromSiteId: SiteId | null, toSiteId: SiteId): Pass | null {
  if (!fromSiteId) return null
  for (const ae of world.adjacencyEdges.values()) {
    if (
      (ae.fromSiteId === fromSiteId && ae.toSiteId === toSiteId) ||
      (ae.fromSiteId === toSiteId && ae.toSiteId === fromSiteId)
    ) {
      return world.passes.get(ae.passId) ?? null
    }
  }
  return null
}

function applyGeneralDeaths(
  armies: Map<string, Army>,
  generals: ReadonlyMap<GeneralId, General>,
  deadGeneralIds: readonly GeneralId[],
  battleSiteId: string,
  events: GameEvent[],
): ReadonlyMap<GeneralId, General> {
  const nextGenerals = new Map(generals)

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
  const passes = new Map<PassId, Pass>(world.passes)
  const realms = new Map<RealmId, Realm>(world.realms)
  const academies = new Map<AcademyId, Academy>(world.academies)
  const diplomacyHistory: DiplomacyEvent[] = [...world.diplomacyHistory]
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

    const passOnEdge = findPassOnEdge(world, army.source, destination)
    const isPassAssault = passOnEdge !== null && passOnEdge.controllerId !== army.realmId
    const battleType: BattleContext['battleType'] = isPassAssault ? 'pass-assault' : 'field'
    const passDefenseBonus = isPassAssault && passOnEdge ? passOnEdge.defenseBonus : 0

    const defenderRealmId = defenders[0]?.realmId ?? destSite.ownerId
    const ctx: BattleContext = {
      attackerArmy: army,
      defenderArmies: defenders,
      attackerGeneral,
      defenderGeneral,
      terrain: (destSite as TerrainSite).terrainType ?? 'plains',
      battleType,
      passDefenseBonus,
      siegeBonus: 0,
      attackerComposition: army.composition ?? DEFAULT_COMPOSITION,
      defenderComposition: defenders[0]?.composition ?? DEFAULT_COMPOSITION,
      date: world.date,
      attackerRealm: world.realms.get(army.realmId) ?? null,
      defenderRealm: defenderRealmId ? world.realms.get(defenderRealmId) ?? null : null,
    }

    const result = resolveCombat(ctx)
    const armySizeTotal =
      army.manpower + defenders.reduce((sum, defender) => sum + defender.manpower, 0)
    const borderSite =
      defenderRealmId !== null
        ? isBorderSite(world.sites, destination, army.realmId, defenderRealmId)
        : false

    events.push({
      type: 'battleResolved',
      payload: {
        battleResolution: result,
        attackerRealmId: army.realmId,
        defenderRealmId,
        siteId: destination,
        armySizeTotal,
        borderSite,
      },
    })

    if (defenderRealmId !== null && defenderRealmId !== army.realmId) {
      const victorRealmId: RealmId =
        result.winner === 'attacker' ? army.realmId : defenderRealmId
      pushDiplomacyHistory(world, diplomacyHistory, events, {
        kind: 'combat_observed',
        actorRealmId: army.realmId,
        targetRealmId: defenderRealmId,
        combatPayload: {
          armySizeTotal,
          borderSite,
          victorRealmId,
        },
      })
    }
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
      const conquered = prevOwner !== currentAttacker.realmId
      const updatedSite: Site = M6_ENABLED && conquered
        ? { ...destSite, ownerId: currentAttacker.realmId, lastConquestTick: world.tick }
        : { ...destSite, ownerId: currentAttacker.realmId }
      sites.set(destination, updatedSite)
      events.push({
        type: 'siteConquered',
        payload: { siteId: destination, byRealm: currentAttacker.realmId, fromRealm: prevOwner },
      })

      if (M6_ENABLED) {
        const attackerRealm = realms.get(currentAttacker.realmId)
        if (attackerRealm) {
          realms.set(currentAttacker.realmId, {
            ...attackerRealm,
            warVictoriesThisYear: (attackerRealm.warVictoriesThisYear ?? 0) + 1,
          })
        }

        if (conquered) {
          const matchingAcademies = [...academies.values()]
            .filter((academy) => academy.hostSiteId === destination && academy.status !== 'dormant')
            .sort((a, b) => a.id.localeCompare(b.id))
          for (const academy of matchingAcademies) {
            academies.set(academy.id, { ...academy, status: 'dormant' })
            events.push({
              type: 'academyDormant',
              payload: {
                academyId: academy.id,
                siteId: destination,
                byRealm: currentAttacker.realmId,
              },
            })
          }
        }
      }

      if (isPassAssault && passOnEdge) {
        const prevController = passOnEdge.controllerId
        passes.set(passOnEdge.id, {
          ...passOnEdge,
          controllerId: currentAttacker.realmId,
          fortification: 50,
        })
        events.push({
          type: 'passCaptured',
          payload: {
            passId: passOnEdge.id,
            byRealm: currentAttacker.realmId,
            fromRealm: prevController,
          },
        })
      }
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

  return {
    world: { ...world, sites, armies, generals, passes, realms, academies, diplomacyHistory },
    nextRng: rng,
    events,
  }
}
