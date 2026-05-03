import type {
  CounterIntelState,
  EspionageActionKind,
  GameEvent,
  RNGState,
  SpyMission,
  World,
} from '~/shared/types'
import { makeCoverageKey } from '~/shared/types'
import { nextRng } from '~/engine/random'
import { applyEventEffect } from '../events/event-chain-engine'
import { applyEspionageReactions } from './espionage-reactions'
import {
  M7_COUNTER_DETECTION_BONUS_PER_LEVEL,
  M7_COUNTER_INTEL_MAX_LEVEL,
  M7_COVERAGE_MAX,
  M7_DISCORD_BASE_SUCCESS,
  M7_DISCORD_LOYALTY_DELTA,
  M7_ENABLED,
  M7_HIGH_RISK_EXPOSE_PROB,
  M7_LOW_RISK_EXPOSE_PROB,
  M7_MID_RISK_EXPOSE_PROB,
  M7_RECON_BASE_SUCCESS,
  M7_RECON_COVERAGE_GAIN,
  M7_RUMOR_BASE_SUCCESS,
  M7_RUMOR_FACTION_DELTA,
  M7_SPY_SKILL_BONUS_PER_MOU,
} from '~/content/m2/balance'

function getBaseSuccess(action: EspionageActionKind): number {
  switch (action) {
    case 'reconnaissance':
      return M7_RECON_BASE_SUCCESS
    case 'rumor':
      return M7_RUMOR_BASE_SUCCESS
    case 'discord':
      return M7_DISCORD_BASE_SUCCESS
    case 'counter_intel':
      return 1.0
  }
}

function getBaseExposeProb(action: EspionageActionKind): number {
  switch (action) {
    case 'reconnaissance':
      return M7_LOW_RISK_EXPOSE_PROB
    case 'rumor':
      return M7_MID_RISK_EXPOSE_PROB
    case 'discord':
      return M7_HIGH_RISK_EXPOSE_PROB
    case 'counter_intel':
      return 0
  }
}

function applyReconSuccess(world: World, mission: SpyMission): World {
  const key = makeCoverageKey(mission.spyRealmId, mission.targetRealmId)
  const current = world.intelligenceCoverage.get(key) ?? 0
  const next = Math.min(M7_COVERAGE_MAX, current + M7_RECON_COVERAGE_GAIN)
  const intelligenceCoverage = new Map(world.intelligenceCoverage)
  intelligenceCoverage.set(key, next)
  return { ...world, intelligenceCoverage }
}

function applyRumorSuccess(world: World, mission: SpyMission): World {
  return applyEventEffect(world, {
    type: 'realm.faction.delta',
    realmId: mission.targetRealmId,
    faction: 'conservatives',
    delta: M7_RUMOR_FACTION_DELTA,
  })
}

function applyDiscordSuccess(world: World, mission: SpyMission): World {
  if (!mission.targetGeneralId) return world
  if (!world.generals.has(mission.targetGeneralId)) return world
  return applyEventEffect(world, {
    type: 'character.loyalty',
    generalId: mission.targetGeneralId,
    delta: M7_DISCORD_LOYALTY_DELTA,
  })
}

function applyCounterIntelSuccess(world: World, mission: SpyMission): World {
  const existing = world.counterIntelStates.get(mission.spyRealmId)
  const currentLevel = existing?.detectionLevel ?? 0
  const nextLevel = Math.min(M7_COUNTER_INTEL_MAX_LEVEL, currentLevel + 1)
  const next: CounterIntelState = {
    realmId: mission.spyRealmId,
    detectionLevel: nextLevel,
    lastUpdatedTick: world.tick,
  }
  const counterIntelStates = new Map(world.counterIntelStates)
  counterIntelStates.set(mission.spyRealmId, next)
  return { ...world, counterIntelStates }
}

function applySuccessEffect(world: World, mission: SpyMission): World {
  switch (mission.action) {
    case 'reconnaissance':
      return applyReconSuccess(world, mission)
    case 'rumor':
      return applyRumorSuccess(world, mission)
    case 'discord':
      return applyDiscordSuccess(world, mission)
    case 'counter_intel':
      return applyCounterIntelSuccess(world, mission)
  }
}

export function espionagePhase(
  world: World,
  rng: RNGState,
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (!M7_ENABLED) return { world, nextRng: rng, events: [] }

  const events: GameEvent[] = []
  let currentWorld = world
  let currentRng = rng

  // Sort missions by ID for RNG reproducibility
  const sortedMissions = [...world.spyMissions.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )

  for (const mission of sortedMissions) {
    if (mission.status !== 'in_progress') continue
    if (currentWorld.tick < mission.resolveTick) continue

    const spy = currentWorld.generals.get(mission.spyGeneralId)
    if (!spy) {
      const newMissions = new Map(currentWorld.spyMissions)
      newMissions.set(mission.id, { ...mission, status: 'cancelled' })
      currentWorld = { ...currentWorld, spyMissions: newMissions }
      events.push({
        type: 'spyMissionCancelled',
        payload: {
          missionId: mission.id,
          spyRealmId: mission.spyRealmId,
          targetRealmId: mission.targetRealmId,
          reason: 'spy_missing',
        },
      })
      continue
    }

    const baseSuccess = getBaseSuccess(mission.action)
    const mouBonus = (spy.attrs?.mou ?? 0) * M7_SPY_SKILL_BONUS_PER_MOU
    const successProb = Math.min(1, baseSuccess + mouBonus)

    const { value: roll, nextState: rng1 } = nextRng(currentRng)
    currentRng = rng1

    const newMissions = new Map(currentWorld.spyMissions)

    if (roll < successProb) {
      newMissions.set(mission.id, { ...mission, status: 'success' })
      currentWorld = { ...currentWorld, spyMissions: newMissions }
      currentWorld = applySuccessEffect(currentWorld, mission)
      events.push({
        type: 'spyMissionResolved',
        payload: {
          missionId: mission.id,
          spyRealmId: mission.spyRealmId,
          targetRealmId: mission.targetRealmId,
          action: mission.action,
          outcome: 'success',
        },
      })
    } else {
      const counterState = currentWorld.counterIntelStates.get(mission.targetRealmId)
      const detectionBonus =
        (counterState?.detectionLevel ?? 0) * M7_COUNTER_DETECTION_BONUS_PER_LEVEL
      const exposeProb = Math.min(1, getBaseExposeProb(mission.action) + detectionBonus)

      const { value: exposeRoll, nextState: rng2 } = nextRng(currentRng)
      currentRng = rng2

      if (exposeRoll < exposeProb) {
        const exposedMission: SpyMission = { ...mission, status: 'exposed' }
        newMissions.set(mission.id, exposedMission)
        currentWorld = { ...currentWorld, spyMissions: newMissions }
        const reactionResult = applyEspionageReactions(currentWorld, exposedMission)
        currentWorld = reactionResult.world
        for (const ev of reactionResult.events) events.push(ev)
      } else {
        newMissions.set(mission.id, { ...mission, status: 'failed' })
        currentWorld = { ...currentWorld, spyMissions: newMissions }
        events.push({
          type: 'spyMissionResolved',
          payload: {
            missionId: mission.id,
            spyRealmId: mission.spyRealmId,
            targetRealmId: mission.targetRealmId,
            action: mission.action,
            outcome: 'failed',
          },
        })
      }
    }
  }

  return { world: currentWorld, nextRng: currentRng, events }
}
