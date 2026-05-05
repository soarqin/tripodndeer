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
  phaseStateWithBattlefieldResult,
  phaseStateWithDiplomacyResult,
  worldWithAiPhaseState,
  type AiPhaseState,
} from './phase-state'
import { dispatchCandidate, findCandidateTargets } from './diplomacy'

export function collectTacticalOptions(
  world: World,
  phaseState: AiPhaseState,
  realmId: RealmId
): AIOption[] {
  const candidateTargets = findCandidateTargets(
    world,
    phaseState.armies,
    realmId
  )

  const options: AIOption[] = candidateTargets.map((candidate) => ({
    kind: 'attack',
    targetSiteId: candidate.targetSiteId,
    armyId: candidate.armyId,
    score: 50,
  }))
  options.push({ kind: 'idle', score: 10 })

  const worldSnapshot = worldWithAiPhaseState(world, phaseState)
  for (const army of [...phaseState.armies.values()]
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
  phaseState: AiPhaseState,
  realmId: RealmId,
  action: AIOption
): {
  readonly phaseState: AiPhaseState
  readonly events: readonly GameEvent[]
} {
  if (!action.targetSiteId || !action.armyId) return { phaseState, events: [] }

  if (action.kind === 'attack' || action.kind === 'cut-supply') {
    const dispatch = dispatchCandidate(
      worldWithAiPhaseState(world, phaseState),
      phaseState.armies,
      realmId,
      {
        targetSiteId: action.targetSiteId,
        armyId: action.armyId,
      }
    )
    return {
      phaseState: phaseStateWithDiplomacyResult(phaseState, dispatch.world),
      events: dispatch.events,
    }
  }

  if (action.kind === 'siege-continue') {
    const newWorld = startSiege(
      worldWithAiPhaseState(world, phaseState),
      action.armyId,
      action.targetSiteId
    )
    return {
      phaseState: phaseStateWithBattlefieldResult(phaseState, newWorld),
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
    const army = phaseState.armies.get(action.armyId)
    if (!army) return { phaseState, events: [] }
    phaseState.armies.set(action.armyId, {
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
      phaseState,
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

  return { phaseState, events: [] }
}
