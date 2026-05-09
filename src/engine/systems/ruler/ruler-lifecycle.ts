import type {
  GameEvent,
  General,
  GeneralId,
  RealmId,
  Realm,
  RNGState,
  RulerDiedEvent,
  RulerState,
  SuccessionCrisisEvent,
  SuccessionResolvedEvent,
  World,
} from '~/shared/types'
import {
  M5_HEALTH_DEATH_THRESHOLD,
  M5_HEALTH_DECREASE_PER_YEAR,
  M5_RULER_BASE_LIFESPAN,
} from '~/content/m2/balance'
import { selectHeir } from './succession'

function isYearStart(world: World): boolean {
  return world.date.season === 'spring' && world.date.month === 1 && world.date.xun === 'shang'
}

function clearOutgoingDiplomaticMemory(world: World, realmId: RealmId): World['diplomaticMemory'] {
  return new Map(
    [...world.diplomaticMemory.entries()].filter(([key]) => !key.startsWith(`${realmId}__`)),
  )
}

function buildSuccessor(
  realmId: RealmId,
  heirId: GeneralId,
  prevRuler: RulerState | undefined,
  generals: ReadonlyMap<GeneralId, General>,
  inOfficeSinceTick: number,
): RulerState {
  const heir = generals.get(heirId)
  return {
    realmId,
    generalId: heirId,
    age: heir?.age ?? 30,
    lifespan: M5_RULER_BASE_LIFESPAN,
    health: 100,
    personality: prevRuler?.personality ?? 'steward',
    personalityDims: {
      expansionDrive: 0.5,
      diplomaticTrust: 0.5,
      caution: 0.5,
      honor: 0.5,
      vindictiveness: 0.5,
      reformInclination: 0.5,
      patience: 0.5,
      preferredStrategy: 'diplomatic',
    },
    successionLawId: 'primogeniture',
    inOfficeSinceTick,
  }
}

export function rulerLifecyclePhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (!isYearStart(world)) {
    return { world, nextRng: rng, events: [] }
  }

  const rulers = new Map(world.rulers)
  const realms = new Map(world.realms)
  const generals = new Map(world.generals)
  let diplomaticMemory = world.diplomaticMemory
  const events: GameEvent[] = []

  const sortedRealmIds = [...rulers.keys()].sort((a, b) => a.localeCompare(b))

  for (const realmId of sortedRealmIds) {
    const ruler = rulers.get(realmId)!

    const newAge = ruler.age + 1
    const newHealth = ruler.health - M5_HEALTH_DECREASE_PER_YEAR

    const updatedRuler: RulerState = { ...ruler, age: newAge, health: newHealth }
    rulers.set(realmId, updatedRuler)

    if (newAge >= ruler.lifespan || newHealth <= M5_HEALTH_DEATH_THRESHOLD) {
      const diedEvent: RulerDiedEvent = {
        type: 'rulerDied',
        payload: {
          realmId,
          generalId: ruler.generalId,
          cause: 'natural',
        },
      }
      events.push(diedEvent)

      const isPlayerRealm = realmId === world.playerRealmId
      const probeWorld: World = { ...world, rulers, realms, generals }
      const heirId = selectHeir(probeWorld, realmId)

      if (heirId !== null && !isPlayerRealm) {
        const successor = buildSuccessor(realmId, heirId, updatedRuler, generals, world.tick)
        rulers.set(realmId, successor)

        const realm = realms.get(realmId)
        if (realm !== undefined) {
          const updatedRealm: Realm = { ...realm, rulerId: heirId }
          realms.set(realmId, updatedRealm)
        }

        diplomaticMemory = clearOutgoingDiplomaticMemory({ ...world, diplomaticMemory }, realmId)

        generals.delete(updatedRuler.generalId)

        const resolvedEvent: SuccessionResolvedEvent = {
          type: 'successionResolved',
          payload: { realmId, newGeneralId: heirId },
        }
        events.push(resolvedEvent)
      } else {
        const crisisEvent: SuccessionCrisisEvent = {
          type: 'successionCrisis',
          payload: { realmId },
        }
        events.push(crisisEvent)
      }
    }
  }

  return {
    world: { ...world, rulers, realms, generals, diplomaticMemory },
    nextRng: rng,
    events,
  }
}
