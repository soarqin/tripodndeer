import type { GameEvent, RNGState, World } from '~/shared/types'
import {
  M4_BASIS_POINTS_DIVISOR,
  M8_2_DIFFICULTY_PROFILES,
  MANPOWER_RECOVERY_PER_MONTH,
  WAR_WEARINESS_PER_MONTH_AT_WAR,
  WAR_WEARINESS_RECOVERY_THRESHOLD,
} from '~/content/m2/balance'
import { getTraitModifiers } from '~/content/m4_1/trait-effects'
import { isAIRealm } from '~/engine/automation/sentinels'

export function manpowerTick(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.tick % 3 !== 0) {
    return { world, nextRng: rng, events: [] }
  }

  const realms = new Map(world.realms)
  const profile = M8_2_DIFFICULTY_PROFILES[world.difficulty]

  for (const realm of world.realms.values()) {
    if (!realm.stats) continue

    const realmAtWar = [...world.wars.keys()].some((key) => {
      const [a, b] = key.split(':')
      return a === realm.id || b === realm.id
    })

    const newWeariness = realmAtWar
      ? realm.stats.warWeariness + WAR_WEARINESS_PER_MONTH_AT_WAR
      : realm.stats.warWeariness

    const baseRecovery = newWeariness > WAR_WEARINESS_RECOVERY_THRESHOLD
      ? Math.floor(MANPOWER_RECOVERY_PER_MONTH / 2)
      : MANPOWER_RECOVERY_PER_MONTH

    const traitMod = getTraitModifiers(realm)
    const manpowerMul = isAIRealm(world, realm.id) ? profile.aiManpowerMul : profile.playerManpowerMul
    const recovery = Math.floor(
      baseRecovery
      * (M4_BASIS_POINTS_DIVISOR + traitMod.recruitmentSpeedMultiplierBp)
      / M4_BASIS_POINTS_DIVISOR
      * manpowerMul,
    )
    const effectiveCap = Math.floor(
      realm.stats.manpowerCap * (M4_BASIS_POINTS_DIVISOR + traitMod.manpowerCapMultiplierBp) / M4_BASIS_POINTS_DIVISOR,
    )

    const newManpower = Math.min(realm.stats.manpowerPool + recovery, effectiveCap)

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
