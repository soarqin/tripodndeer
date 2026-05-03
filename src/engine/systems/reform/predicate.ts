import type { AttitudeBucket, PredicateNode, Realm, World } from '~/shared/types'
import { relationKey } from '~/engine/systems/diplomacy/diplomacy-core'

const TICKS_PER_YEAR = 36

const ATTITUDE_ORDER: readonly AttitudeBucket[] = ['hostile', 'cold', 'neutral', 'friendly', 'ally']

export function attitudeToBucket(value: number): AttitudeBucket {
  if (value < -50) return 'hostile'
  if (value < -20) return 'cold'
  if (value < 20) return 'neutral'
  if (value < 60) return 'friendly'
  return 'ally'
}

export function evaluatePredicate(world: World, realm: Realm, node: PredicateNode): boolean {
  switch (node.kind) {
    case 'realm.id':
      return realm.id === node.value

    case 'realm.has-character-with-specialty':
      return [...world.generals.values()].some(
        (g) => g.realmId === realm.id && g.specialty === node.specialty,
      )

    case 'realm.ruler-personality-in': {
      const ruler = world.rulers.get(realm.id)
      if (!ruler) return false
      return node.values.includes(ruler.personality)
    }

    case 'realm.has-trait':
      return node.not
        ? !realm.traits.includes(node.trait)
        : realm.traits.includes(node.trait)

    case 'realm.no-active-war':
      return ![...world.wars.keys()].some((key) =>
        key.split(':').includes(realm.id),
      )

    case 'realm.treasury-above':
      return realm.economy.treasury > node.value

    case 'realm.population-above': {
      const totalPop = [...world.sites.values()]
        .filter((s) => s.ownerId === realm.id)
        .reduce((sum, s) => sum + s.economy.population, 0)
      return totalPop > node.value
    }

    case 'realm.ruler-in-office-years': {
      const ruler = world.rulers.get(realm.id)
      if (!ruler) return false
      const ticksInOffice = world.tick - ruler.inOfficeSinceTick
      const yearsInOffice = ticksInOffice / TICKS_PER_YEAR
      return yearsInOffice >= node.minYears
    }

    case 'realm.has-political-system':
      return realm.politicalSystem === node.system

    case 'realm.year-after':
      return world.date.yearBC <= node.yearBC

    case 'and':
      return node.children.every((child) => evaluatePredicate(world, realm, child))

    case 'or':
      return node.children.some((child) => evaluatePredicate(world, realm, child))

    case 'site.terrain': {
      const site = world.sites.get(node.siteId)
      return site ? site.terrainType === node.value : false
    }

    case 'site.population-above': {
      const site = world.sites.get(node.siteId)
      return site ? site.economy.population > node.value : false
    }

    case 'site.governor-zheng-above': {
      const site = world.sites.get(node.siteId)
      if (!site) return false
      const govAssignment = [...world.governorAssignments.values()].find(
        (ga) => ga.siteId === node.siteId,
      )
      if (!govAssignment) return false
      const general = world.generals.get(govAssignment.generalId)
      return general ? (general.attrs?.zheng ?? 0) > node.value : false
    }

    case 'realm.faction-influence-above': {
      const factionState = [...world.factionInfluences.values()].find(
        (fi) => fi.realmId === node.realmId,
      )
      if (!factionState) return false
      const influence = factionState.influences.get(node.faction) ?? 0
      return influence > node.value
    }

    case 'realm.prestige.gte':
      return (realm.prestige ?? 0) >= node.threshold

    case 'realm.prestige.lt':
      return (realm.prestige ?? 0) < node.threshold

    case 'realm.relation.attitude': {
      if (realm.id === node.targetRealmId) return false
      const key = relationKey(realm.id, node.targetRealmId)
      const relation = world.relations.get(key)
      const attitudeValue = relation?.attitude ?? 0
      const bucket = attitudeToBucket(attitudeValue)
      return ATTITUDE_ORDER.indexOf(bucket) >= ATTITUDE_ORDER.indexOf(node.minAttitude)
    }

    case 'realm.zhouInvestiture.has': {
      const investiture = world.zhouInvestiture.get(realm.id)
      if (!investiture) return false
      if (node.rank) return investiture.rank === node.rank
      return true
    }

    case 'realm.zhouInvestiture.absent':
      return !world.zhouInvestiture.has(realm.id)

    case 'realm.id.equals':
      return realm.id === node.value
  }
}
