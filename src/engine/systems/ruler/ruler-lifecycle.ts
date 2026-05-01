import type { GameEvent, RNGState, RulerDiedEvent, RulerState, World } from '~/shared/types'
import { M5_HEALTH_DEATH_THRESHOLD, M5_HEALTH_DECREASE_PER_YEAR } from '~/content/m2/balance'

function isYearStart(world: World): boolean {
  return world.date.season === 'spring' && world.date.month === 1 && world.date.xun === 'shang'
}

export function rulerLifecyclePhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (!isYearStart(world)) {
    return { world, nextRng: rng, events: [] }
  }

  const rulers = new Map(world.rulers)
  const events: RulerDiedEvent[] = []

  const sortedRealmIds = [...rulers.keys()].sort((a, b) => a.localeCompare(b))

  for (const realmId of sortedRealmIds) {
    const ruler = rulers.get(realmId)!

    const newAge = ruler.age + 1
    const newHealth = ruler.health - M5_HEALTH_DECREASE_PER_YEAR

    const updatedRuler: RulerState = { ...ruler, age: newAge, health: newHealth }
    rulers.set(realmId, updatedRuler)

    if (newAge >= ruler.lifespan || newHealth <= M5_HEALTH_DEATH_THRESHOLD) {
      events.push({
        type: 'rulerDied',
        payload: {
          realmId,
          generalId: ruler.generalId,
          cause: 'natural',
        },
      })
    }
  }

  return {
    world: { ...world, rulers },
    nextRng: rng,
    events,
  }
}
