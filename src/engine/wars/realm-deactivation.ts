import type { GameEvent, RNGState, RealmId, RealmStatus, World } from '~/shared/types'

export type RealmDeactivationReason = 'conquered' | 'extinguished' | 'merged'

export function deactivateRealm(
  world: World,
  realmId: RealmId,
  reason: RealmDeactivationReason,
): { world: World; events: readonly GameEvent[] } {
  const realm = world.realms.get(realmId)
  if (!realm || realm.status === 'deactivated') return { world, events: [] }

  const realms = new Map(world.realms)
  realms.set(realmId, { ...realm, status: 'deactivated' satisfies RealmStatus })

  const generals = new Map(world.generals)
  for (const [generalId, general] of generals) {
    if (general.realmId === realmId) {
      generals.set(generalId, { ...general, loyalty: 0 })
    }
  }

  const wars = new Map(world.wars)
  for (const warKey of wars.keys()) {
    const participants = warKey.split(':')
    if (participants.includes(realmId)) {
      wars.delete(warKey)
    }
  }

  const peaceProposals = new Map(world.peaceProposals)
  for (const [proposalId, proposal] of peaceProposals) {
    if (proposal.proposingRealmId === realmId || proposal.targetRealmId === realmId) {
      peaceProposals.delete(proposalId)
    }
  }

  const sieges = new Map(world.sieges)
  for (const [siegeId, siege] of sieges) {
    const hasAttacker = siege.attackerArmyIds.some(
      (armyId) => world.armies.get(armyId)?.realmId === realmId,
    )
    const defenderSite = world.sites.get(siege.defenderSiteId)
    if (hasAttacker || defenderSite?.ownerId === realmId) {
      sieges.delete(siegeId)
    }
  }

  return {
    world: {
      ...world,
      realms,
      generals,
      wars,
      peaceProposals,
      sieges,
    },
    events: [
      {
        type: 'realmDeactivated',
        payload: {
          realmId,
          reason,
          tick: world.tick,
        },
      },
    ],
  }
}

export function realmDeactivationPhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  let nextWorld = world
  const events: GameEvent[] = []

  for (const [realmId, realm] of world.realms) {
    if ((realm.status ?? 'active') !== 'active') continue

    const hasOwnedSite = [...world.sites.values()].some((site) => site.ownerId === realmId)
    if (hasOwnedSite) continue

    const result = deactivateRealm(nextWorld, realmId, 'conquered')
    nextWorld = result.world
    events.push(...result.events)
  }

  return { world: nextWorld, nextRng: rng, events }
}
