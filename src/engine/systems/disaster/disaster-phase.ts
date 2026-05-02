import type {
  DisasterDefinition,
  DisasterState,
  FactionId,
  FactionInfluenceState,
  GameEvent,
  RealmId,
  RNGState,
  World,
} from '~/shared/types'
import { nextRng } from '~/engine/random'
import { applyEventEffect } from '../events/event-chain-engine'
import {
  M42_AI_DISASTER_RELIEF_PROPENSITY,
  M42_DISASTER_COOLDOWN_TICKS,
  M42_DISASTER_DECISION_TIMEOUT_TICKS,
  M42_FACTION_INFLUENCE_MAX,
  M42_FACTION_INFLUENCE_MIN,
} from '~/content/m2/balance'
import { evaluatePredicate } from '../reform/predicate'
import { getPersonality } from '../ai/utility-scorer'
import { DisasterDefinitionSchema } from '~/shared/schemas'
import fengNianJson from '~/content/m4_2/disasters/feng-nian.json'
import qianNianJson from '~/content/m4_2/disasters/qian-nian.json'
import daHanJson from '~/content/m4_2/disasters/da-han.json'
import daShuiJson from '~/content/m4_2/disasters/da-shui.json'
import huangZaiJson from '~/content/m4_2/disasters/huang-zai.json'
import wenYiJson from '~/content/m4_2/disasters/wen-yi.json'

const DEFAULT_DEFINITIONS: readonly DisasterDefinition[] = [
  fengNianJson,
  qianNianJson,
  daHanJson,
  daShuiJson,
  huangZaiJson,
  wenYiJson,
].map((json) => DisasterDefinitionSchema.parse(json))

function loadDisasterDefinitions(): readonly DisasterDefinition[] {
  return DEFAULT_DEFINITIONS
}

function setDisasterState(
  world: World,
  realmId: string,
  state: DisasterState,
): World {
  const disasterStates = new Map(world.disasterStates)
  disasterStates.set(realmId, state)
  return { ...world, disasterStates }
}

const DISASTER_CHOICE_FACTION_DELTAS: Record<string, readonly { faction: FactionId; delta: number }[]> = {
  open_granary: [
    { faction: 'royal_kin', delta: 5 },
    { faction: 'reformists', delta: 3 },
  ],
  reduce_tax: [
    { faction: 'military_meritocracy', delta: 3 },
  ],
  forced_levy: [
    { faction: 'conservatives', delta: 5 },
    { faction: 'reformists', delta: -5 },
  ],
  ignore: [
    { faction: 'noble_clans', delta: -10 },
    { faction: 'military_meritocracy', delta: 5 },
  ],
}

function applyDisasterFactionDelta(
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

function applyChoiceEffects(world: World, def: DisasterDefinition, choiceId: string, realmId: RealmId): World {
  const choice = def.playerChoices.find((c) => c.id === choiceId)
  if (!choice) return world
  let next = world
  for (const effect of choice.effects) {
    next = applyEventEffect(next, effect)
  }
  const factionDeltas = DISASTER_CHOICE_FACTION_DELTAS[choiceId] ?? []
  for (const { faction, delta } of factionDeltas) {
    next = applyDisasterFactionDelta(next, realmId, faction, delta)
  }
  return next
}

export function disasterPhase(
  world: World,
  rng: RNGState,
  definitions: readonly DisasterDefinition[] = loadDisasterDefinitions(),
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.date.xun !== 'shang') {
    return { world, nextRng: rng, events: [] }
  }

  let currentWorld = world
  let currentRng = rng
  const events: GameEvent[] = []

  const sortedRealms = [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )
  const sortedDefs = [...definitions].sort((a, b) => a.id.localeCompare(b.id))

  for (const realm of sortedRealms) {
    const existingState = currentWorld.disasterStates.get(realm.id)

    if (existingState?.status === 'awaiting_decision') {
      const ticksWaiting = currentWorld.tick - existingState.startedAtTick
      if (ticksWaiting >= M42_DISASTER_DECISION_TIMEOUT_TICKS) {
        const def = definitions.find((d) => d.id === existingState.disasterId)
        if (def) {
          currentWorld = applyChoiceEffects(currentWorld, def, 'ignore', realm.id)
        }
        const resolvedState: DisasterState = {
          ...existingState,
          status: 'resolved',
          chosenChoiceId: 'ignore',
          resolvedAtTick: currentWorld.tick,
        }
        currentWorld = setDisasterState(currentWorld, realm.id, resolvedState)
        events.push({
          type: 'disasterResolved',
          payload: {
            realmId: realm.id,
            disasterId: existingState.disasterId,
            choiceId: 'ignore',
            timeout: true,
          },
        })
      }
      continue
    }

    if (existingState?.status === 'resolving') continue

    if (existingState?.status === 'resolved') {
      const ticksSince = currentWorld.tick - (existingState.resolvedAtTick ?? 0)
      if (ticksSince < M42_DISASTER_COOLDOWN_TICKS) continue
    }

    const realmSites = [...currentWorld.sites.values()]
      .filter((s) => s.ownerId === realm.id)
      .sort((a, b) => a.id.localeCompare(b.id))

    if (realmSites.length === 0) continue

    let triggered = false
    for (const def of sortedDefs) {
      if (triggered) break

      if (!evaluatePredicate(currentWorld, realm, def.trigger)) continue

      const monthlyProb = def.baseProbabilityBp / 10000 / 12
      const { value: probValue, nextState: rngAfterProb } = nextRng(currentRng)
      currentRng = rngAfterProb
      if (probValue >= monthlyProb) continue

      const { value: siteValue, nextState: rngAfterSite } = nextRng(currentRng)
      currentRng = rngAfterSite
      const siteIndex = Math.min(
        realmSites.length - 1,
        Math.floor(siteValue * realmSites.length),
      )
      const targetSite = realmSites[siteIndex]!

      const newState: DisasterState = {
        realmId: realm.id,
        disasterId: def.id,
        siteId: targetSite.id,
        startedAtTick: currentWorld.tick,
        status: 'awaiting_decision',
      }
      currentWorld = setDisasterState(currentWorld, realm.id, newState)
      events.push({
        type: 'disasterTriggered',
        payload: {
          realmId: realm.id,
          disasterId: def.id,
          siteId: targetSite.id,
        },
      })
      triggered = true

      if (realm.id !== currentWorld.playerRealmId) {
        const personality = getPersonality(currentWorld, realm.id)
        const preferredChoiceId =
          M42_AI_DISASTER_RELIEF_PROPENSITY[personality] ?? 'ignore'
        const choice =
          def.playerChoices.find((c) => c.id === preferredChoiceId)
          ?? def.playerChoices.find((c) => c.id === 'ignore')
          ?? def.playerChoices[0]
        if (!choice) break

        currentWorld = applyChoiceEffects(currentWorld, def, choice.id, realm.id)
        const resolvedState: DisasterState = {
          ...newState,
          status: 'resolved',
          chosenChoiceId: choice.id,
          resolvedAtTick: currentWorld.tick,
        }
        currentWorld = setDisasterState(currentWorld, realm.id, resolvedState)
        events.push({
          type: 'disasterResolved',
          payload: {
            realmId: realm.id,
            disasterId: def.id,
            choiceId: choice.id,
            timeout: false,
          },
        })
      }
    }
  }

  return { world: currentWorld, nextRng: currentRng, events }
}
