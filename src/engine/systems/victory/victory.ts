import type { GameEvent, RNGState, World } from '~/shared/types'

export function isVictorious(world: World): boolean {
  if (world.sites.size === 0) return false

  for (const site of world.sites.values()) {
    if (site.ownerId !== world.playerRealmId) return false
  }

  return true
}

export function isDefeated(world: World): boolean {
  if (world.sites.size === 0) return false

  for (const site of world.sites.values()) {
    if (site.ownerId === world.playerRealmId) return false
  }

  return true
}

export function victoryCheckStep(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []

  if (isDefeated(world)) {
    events.push({
      type: 'playerDefeated',
      payload: { realmId: world.playerRealmId },
    })
  } else if (isVictorious(world)) {
    events.push({
      type: 'victoryAchieved',
      payload: { realmId: world.playerRealmId },
    })
  }

  return { world, nextRng: rng, events }
}
