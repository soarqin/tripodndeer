import type {
  GameEvent,
  RealmId,
  ReformDefinition,
  ReformState,
  World,
} from '~/shared/types'
import { applyEventEffect } from '../events/event-chain-engine'
import { M41_REFORM_FAILURE_TREASURY_LOSS } from '~/content/m2/balance'

export function applyReformChoice(
  world: World,
  realmId: RealmId,
  reformDef: ReformDefinition,
  choiceId: string,
): { world: World; events: GameEvent[] } {
  const state = world.reformStates.get(realmId)
  if (!state || state.status !== 'in_progress') return { world, events: [] }

  const stage = reformDef.stages.find((s) => s.id === state.currentStageId)
  if (!stage) return { world, events: [] }

  const choice = stage.choices.find((c) => c.id === choiceId)
  if (!choice) return { world, events: [] }

  let currentWorld = world
  for (const effect of choice.effects) {
    currentWorld = applyEventEffect(currentWorld, effect)
  }

  const updatedState: ReformState = {
    ...state,
    choiceHistory: [
      ...state.choiceHistory,
      { stageId: state.currentStageId, choiceId, tick: world.tick },
    ],
  }

  const events: GameEvent[] = []

  if (choice.outcome === 'continue' && choice.nextStageId) {
    const nextState: ReformState = {
      ...updatedState,
      currentStageId: choice.nextStageId,
      stageEnteredAtTick: world.tick,
    }
    const reformStates = new Map(currentWorld.reformStates)
    reformStates.set(realmId, nextState)
    currentWorld = { ...currentWorld, reformStates }
  } else if (choice.outcome === 'success') {
    const result = completeReform(currentWorld, realmId, reformDef, true, updatedState)
    currentWorld = result.world
    events.push(...result.events)
  } else if (choice.outcome === 'failure') {
    const result = completeReform(currentWorld, realmId, reformDef, false, updatedState)
    currentWorld = result.world
    events.push(...result.events)
  }

  return { world: currentWorld, events }
}

export function advanceReformStage(
  world: World,
  realmId: RealmId,
  nextStageId: string,
): World {
  const state = world.reformStates.get(realmId)
  if (!state) return world

  const nextState: ReformState = {
    ...state,
    currentStageId: nextStageId,
    stageEnteredAtTick: world.tick,
  }
  const reformStates = new Map(world.reformStates)
  reformStates.set(realmId, nextState)
  return { ...world, reformStates }
}

export function completeReform(
  world: World,
  realmId: RealmId,
  reformDef: ReformDefinition,
  success: boolean,
  partialState?: ReformState,
): { world: World; events: GameEvent[] } {
  const state = partialState ?? world.reformStates.get(realmId)
  if (!state) return { world, events: [] }

  let currentWorld = world
  const events: GameEvent[] = []

  if (success) {
    currentWorld = applyEventEffect(currentWorld, {
      type: 'realm.trait.add',
      realmId,
      trait: reformDef.successTrait,
    })
    events.push({
      type: 'reformCompleted',
      payload: { realmId, reformId: reformDef.id, success: true },
    })
  } else {
    currentWorld = applyEventEffect(currentWorld, {
      type: 'realm.trait.add',
      realmId,
      trait: reformDef.failureTrait,
    })
    currentWorld = applyEventEffect(currentWorld, {
      type: 'realm.treasury',
      realmId,
      delta: -M41_REFORM_FAILURE_TREASURY_LOSS,
    })
    const reformer = [...currentWorld.generals.values()].find(
      (g) => g.realmId === realmId && g.specialty === 'reformer',
    )
    if (reformer) {
      currentWorld = applyEventEffect(currentWorld, {
        type: 'character.kill',
        generalId: reformer.id,
      })
    }
    events.push({
      type: 'reformCompleted',
      payload: { realmId, reformId: reformDef.id, success: false },
    })
  }

  const finalState: ReformState = {
    ...state,
    status: success ? 'completed_success' : 'completed_failure',
  }
  const reformStates = new Map(currentWorld.reformStates)
  reformStates.set(realmId, finalState)
  currentWorld = { ...currentWorld, reformStates }

  return { world: currentWorld, events }
}
