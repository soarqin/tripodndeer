import type { GameEvent, RealmId, World } from '~/shared/types'
import { findTravelCost } from '~/engine/systems/march'
import { startSiege } from '~/engine/systems/siege'
import {
  evaluateCutSupplyOption,
  evaluateRetreatOption,
  evaluateSiegeOption,
} from '../tactics'
import type { AIOption } from '../utility-scorer'
import {
  tickContextWithBattlefieldResult,
  tickContextWithDiplomacyResult,
  worldWithAiTickContext,
  type AiTickContext,
} from './tick-context'
import { dispatchCandidate, findCandidateTargets } from './diplomacy'

export function collectTacticalOptions(
  world: World,
  tickContext: AiTickContext,
  realmId: RealmId
): AIOption[] {
  const candidateTargets = findCandidateTargets(
    world,
    tickContext.armies,
    realmId
  )

  const options: AIOption[] = candidateTargets.map((candidate) => ({
    kind: 'attack',
    targetSiteId: candidate.targetSiteId,
    armyId: candidate.armyId,
    score: 50,
  }))
  options.push({ kind: 'idle', score: 10 })

  const worldSnapshot = worldWithAiTickContext(world, tickContext)
  for (const army of [...tickContext.armies.values()]
    .filter((a) => a.realmId === realmId)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const siegeOpt = evaluateSiegeOption(army, worldSnapshot)
    if (siegeOpt) options.push(siegeOpt)
    const cutSupplyOpt = evaluateCutSupplyOption(army, worldSnapshot)
    if (cutSupplyOpt) options.push(cutSupplyOpt)
    const retreatOpt = evaluateRetreatOption(army, worldSnapshot)
    if (retreatOpt) options.push(retreatOpt)
  }

  return options
}

export function applyTacticalAction(
  world: World,
  tickContext: AiTickContext,
  realmId: RealmId,
  action: AIOption
): {
  readonly tickContext: AiTickContext
  readonly events: readonly GameEvent[]
} {
  if (!action.targetSiteId || !action.armyId) return { tickContext, events: [] }

  if (action.kind === 'attack' || action.kind === 'cut-supply') {
    const dispatch = dispatchCandidate(
      worldWithAiTickContext(world, tickContext),
      tickContext.armies,
      realmId,
      {
        targetSiteId: action.targetSiteId,
        armyId: action.armyId,
      }
    )
    return {
      tickContext: tickContextWithDiplomacyResult(tickContext, dispatch.world),
      events: dispatch.events,
    }
  }

  if (action.kind === 'siege-continue') {
    const newWorld = startSiege(
      worldWithAiTickContext(world, tickContext),
      action.armyId,
      action.targetSiteId
    )
    return {
      tickContext: tickContextWithBattlefieldResult(tickContext, newWorld),
      events: [
        {
          type: 'aiStartedSiege',
          payload: {
            realmId,
            armyId: action.armyId,
            siteId: action.targetSiteId,
          },
        },
      ],
    }
  }

  if (action.kind === 'retreat') {
    const army = tickContext.armies.get(action.armyId)
    if (!army) return { tickContext, events: [] }
    tickContext.armies.set(action.armyId, {
      ...army,
      state: 'retreating',
      destination: action.targetSiteId,
      ticksRemaining: findTravelCost(
        world,
        army.location,
        action.targetSiteId,
        realmId
      ),
      source: army.location,
    })
    return {
      tickContext,
      events: [
        {
          type: 'aiRetreatedArmy',
          payload: {
            realmId,
            armyId: action.armyId,
            targetSiteId: action.targetSiteId,
          },
        },
      ],
    }
  }

  return { tickContext, events: [] }
}
