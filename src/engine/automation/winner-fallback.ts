import type { RealmId, World } from '~/shared/types'

import { getWinnerRealmId } from './auto-battle'

export function getWinnerWithLargestActiveFallback(world: World): RealmId | null {
  const winner = getWinnerRealmId(world)
  if (winner !== null) return winner

  const siteCounts = new Map<RealmId, number>()
  for (const site of world.sites.values()) {
    if (site.ownerId) {
      siteCounts.set(site.ownerId, (siteCounts.get(site.ownerId) ?? 0) + 1)
    }
  }

  let bestRealm: RealmId | null = null
  let bestCount = -1

  const activeRealms = [...world.realms.values()]
    .filter((realm) => (realm.status ?? 'active') === 'active')
    .sort((a, b) => a.id.localeCompare(b.id))

  for (const realm of activeRealms) {
    const count = siteCounts.get(realm.id) ?? 0
    if (count > bestCount) {
      bestCount = count
      bestRealm = realm.id
    }
  }

  return bestRealm
}
