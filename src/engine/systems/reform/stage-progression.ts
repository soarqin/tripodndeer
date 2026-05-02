import type {
  FactionId,
  FactionInfluenceState,
  GameEvent,
  RealmId,
  ReformDefinition,
  ReformState,
  World,
} from '~/shared/types'
import { applyEventEffect } from '../events/event-chain-engine'
import {
  M41_REFORM_FAILURE_TREASURY_LOSS,
  M42_FACTION_INFLUENCE_MAX,
  M42_FACTION_INFLUENCE_MIN,
} from '~/content/m2/balance'

const REFORM_FACTION_EFFECTS: Record<string, readonly { faction: FactionId; delta: number }[]> = {
  shang_yang: [
    { faction: 'military_meritocracy', delta: 20 },
    { faction: 'noble_clans', delta: -15 },
    { faction: 'conservatives', delta: -10 },
  ],
  wu_qi: [
    { faction: 'military_meritocracy', delta: 15 },
    { faction: 'conservatives', delta: -10 },
  ],
  hu_fu_qi_she: [
    { faction: 'military_meritocracy', delta: 15 },
    { faction: 'conservatives', delta: -10 },
  ],
  qi_jixia_debate: [
    { faction: 'foreign_clients', delta: 10 },
  ],
  chu_wu_qi_legacy: [
    { faction: 'military_meritocracy', delta: 10 },
    { faction: 'conservatives', delta: -8 },
  ],
  han_shen_buhai_restart: [
    { faction: 'reformists', delta: 15 },
    { faction: 'conservatives', delta: -10 },
  ],
}

function applyReformFactionDelta(
  world: World,
  realmId: RealmId,
  faction: FactionId,
  delta: number,
): World {
  const current = world.factionInfluences.get(realmId)
  if (!current) return world
  const oldVal = current.influences.get(faction) ?? 0
  const newVal = Math.min(M42_FACTION_INFLUENCE_MAX, Math.max(M42_FACTION_INFLUENCE_MIN, oldVal + delta))
  const influences = new Map(current.influences)
  influences.set(faction, newVal)
  const next: FactionInfluenceState = { ...current, influences }
  const factionInfluences = new Map(world.factionInfluences)
  factionInfluences.set(realmId, next)
  return { ...world, factionInfluences }
}

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
    const factionDeltas = REFORM_FACTION_EFFECTS[reformDef.id] ?? []
    for (const { faction, delta } of factionDeltas) {
      currentWorld = applyReformFactionDelta(currentWorld, realmId, faction, delta)
    }
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
