import type { PredicateNode, Realm, World } from '~/shared/types'

const TICKS_PER_YEAR = 36

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
  }
}
