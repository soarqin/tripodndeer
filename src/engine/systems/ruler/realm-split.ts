import type {
  DiplomaticRelation,
  GameEvent,
  Realm,
  RealmId,
  RealmSplitEvent,
  RelationKey,
  SiteId,
  WarKey,
  WarState,
  World,
} from '~/shared/types'

export interface SplitConfig {
  readonly newRealmIdsBySite: Readonly<Record<SiteId, RealmId>>
}

export function splitRealm(
  world: World,
  oldRealmId: RealmId,
  splitConfig: SplitConfig,
): { world: World; events: readonly GameEvent[] } {
  const oldRealm = world.realms.get(oldRealmId)
  if (!oldRealm) {
    return { world, events: [] }
  }

  const { newRealmIdsBySite } = splitConfig

  const newRealmIds = [...new Set(Object.values(newRealmIdsBySite))].sort((a, b) =>
    a.localeCompare(b),
  )
  if (newRealmIds.length === 0) {
    return { world, events: [] }
  }

  const primaryNewRealmId = newRealmIds[0]!

  const sites = new Map(world.sites)
  for (const [siteId, site] of sites) {
    if (site.ownerId === oldRealmId) {
      const newRealmId = newRealmIdsBySite[siteId] ?? primaryNewRealmId
      sites.set(siteId, { ...site, ownerId: newRealmId })
    }
  }

  const siteCounts: Record<RealmId, number> = {}
  for (const newRealmId of newRealmIds) {
    siteCounts[newRealmId] = 0
  }
  for (const [, newRealmId] of Object.entries(newRealmIdsBySite)) {
    if (newRealmId in siteCounts) {
      siteCounts[newRealmId] = (siteCounts[newRealmId] ?? 0) + 1
    }
  }
  const totalAssignedSites = Object.values(siteCounts).reduce((a, b) => a + b, 0)
  const denominator = totalAssignedSites > 0 ? totalAssignedSites : newRealmIds.length

  const realms = new Map(world.realms)
  realms.delete(oldRealmId)

  for (const newRealmId of newRealmIds) {
    const isPrimary = newRealmId === primaryNewRealmId
    const newSitesForRealm = Object.entries(newRealmIdsBySite)
      .filter(([, rid]) => rid === newRealmId)
      .map(([sid]) => sid)
      .sort((a, b) => a.localeCompare(b))

    const fraction =
      totalAssignedSites > 0 ? (siteCounts[newRealmId] ?? 0) / denominator : 1 / denominator

    const capital = newSitesForRealm[0] ?? oldRealm.capital

    const newRealm: Realm = {
      ...oldRealm,
      id: newRealmId,
      displayName: isPrimary ? oldRealm.displayName : `${oldRealm.displayName} (分裂)`,
      capital,
      initialSites: newSitesForRealm,
      initialArmies: [],
      economy: {
        treasury: Math.floor(oldRealm.economy.treasury * fraction),
        foodStores: Math.floor(oldRealm.economy.foodStores * fraction),
        taxRate: oldRealm.economy.taxRate,
      },
      rulerId: isPrimary ? oldRealm.rulerId ?? null : null,
    }
    realms.set(newRealmId, newRealm)
  }

  const armies = new Map(world.armies)
  for (const [armyId, army] of armies) {
    if (army.realmId === oldRealmId) {
      const newRealmId = newRealmIdsBySite[army.location] ?? primaryNewRealmId
      armies.set(armyId, { ...army, realmId: newRealmId })
    }
  }

  const governorAssignments = new Map(world.governorAssignments)
  for (const [siteId, assignment] of governorAssignments) {
    if (assignment.realmId === oldRealmId) {
      const newRealmId = newRealmIdsBySite[siteId] ?? primaryNewRealmId
      governorAssignments.set(siteId, { ...assignment, realmId: newRealmId })
    }
  }

  const generals = new Map(world.generals)
  for (const [generalId, general] of generals) {
    if (general.realmId === oldRealmId) {
      let newRealmId: RealmId = primaryNewRealmId
      for (const assignment of governorAssignments.values()) {
        if (assignment.generalId === generalId) {
          newRealmId = assignment.realmId
          break
        }
      }
      generals.set(generalId, { ...general, realmId: newRealmId })
    }
  }

  const wars = new Map<WarKey, WarState>()
  for (const [key, war] of world.wars) {
    const parts = key.split(':')
    if (parts.length !== 2) {
      wars.set(key, war)
      continue
    }
    const [a, b] = parts as [RealmId, RealmId]
    if (a === oldRealmId || b === oldRealmId) {
      const other = a === oldRealmId ? b : a
      if (other === primaryNewRealmId) continue
      const newKey = [primaryNewRealmId, other].sort((x, y) => x.localeCompare(y)).join(':')
      wars.set(newKey, war)
    } else {
      wars.set(key, war)
    }
  }

  const relations = new Map<RelationKey, DiplomaticRelation>()
  for (const [key, relation] of world.relations) {
    if (relation.realmAId === oldRealmId || relation.realmBId === oldRealmId) {
      const otherRealmId =
        relation.realmAId === oldRealmId ? relation.realmBId : relation.realmAId
      if (otherRealmId === primaryNewRealmId) continue
      const sortedPair = [primaryNewRealmId, otherRealmId].sort((x, y) => x.localeCompare(y))
      const newKey = sortedPair.join('__')
      relations.set(newKey, {
        ...relation,
        key: newKey,
        realmAId: sortedPair[0]!,
        realmBId: sortedPair[1]!,
      })
    } else {
      relations.set(key, relation)
    }
  }

  const rulers = new Map(world.rulers)
  const oldRulerState = rulers.get(oldRealmId)
  rulers.delete(oldRealmId)
  if (oldRulerState) {
    rulers.set(primaryNewRealmId, { ...oldRulerState, realmId: primaryNewRealmId })
  }

  const peaceProposals = new Map(world.peaceProposals)
  for (const [id, proposal] of peaceProposals) {
    if (proposal.proposingRealmId === oldRealmId || proposal.targetRealmId === oldRealmId) {
      peaceProposals.delete(id)
    }
  }

  const passes = new Map(world.passes)
  for (const [passId, pass] of passes) {
    if (pass.controllerId === oldRealmId) {
      passes.set(passId, { ...pass, controllerId: primaryNewRealmId })
    }
  }

  const coalitions = new Map(world.coalitions)
  for (const [coalitionId, coalition] of coalitions) {
    if (coalition.memberRealmIds.includes(oldRealmId)) {
      coalitions.set(coalitionId, {
        ...coalition,
        memberRealmIds: coalition.memberRealmIds.filter((id) => id !== oldRealmId),
      })
    }
  }

  const zhouInvestiture = new Map(world.zhouInvestiture)
  const oldInvestiture = zhouInvestiture.get(oldRealmId)
  zhouInvestiture.delete(oldRealmId)
  if (oldInvestiture) {
    zhouInvestiture.set(primaryNewRealmId, { ...oldInvestiture, realmId: primaryNewRealmId })
  }

  const sieges = new Map(world.sieges)

  const playerRealmId =
    world.playerRealmId === oldRealmId ? primaryNewRealmId : world.playerRealmId

  const event: RealmSplitEvent = {
    type: 'realmSplit',
    payload: { oldRealmId, newRealmIds },
  }

  return {
    world: {
      ...world,
      sites,
      realms,
      armies,
      generals,
      governorAssignments,
      wars,
      relations,
      rulers,
      peaceProposals,
      passes,
      coalitions,
      zhouInvestiture,
      sieges,
      playerRealmId,
    },
    events: [event],
  }
}
