import type { GameEvent, RNGState, World } from '~/shared/types'
import {
  MANPOWER_RECOVERY_PER_MONTH,
  WAR_WEARINESS_PER_MONTH_AT_WAR,
  WAR_WEARINESS_RECOVERY_THRESHOLD,
} from '~/content/m2/balance'

export function manpowerTick(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.tick % 3 !== 0) {
    return { world, nextRng: rng, events: [] }
  }

  const realms = new Map(world.realms)

  for (const realm of world.realms.values()) {
    if (!realm.stats) continue

    const realmAtWar = [...world.wars.keys()].some((key) => {
      const [a, b] = key.split(':')
      return a === realm.id || b === realm.id
    })

    const newWeariness = realmAtWar
      ? realm.stats.warWeariness + WAR_WEARINESS_PER_MONTH_AT_WAR
      : realm.stats.warWeariness

    const recovery = newWeariness > WAR_WEARINESS_RECOVERY_THRESHOLD
      ? Math.floor(MANPOWER_RECOVERY_PER_MONTH / 2)
      : MANPOWER_RECOVERY_PER_MONTH

    const newManpower = Math.min(realm.stats.manpowerPool + recovery, realm.stats.manpowerCap)

    realms.set(realm.id, {
      ...realm,
      stats: {
        ...realm.stats,
        warWeariness: newWeariness,
        manpowerPool: newManpower,
      },
    })
  }

  return { world: { ...world, realms }, nextRng: rng, events: [] }
}
