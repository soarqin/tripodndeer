import type {
  GameEvent,
  RNGState,
  ReformDefinition,
  ReformId,
  ReformState,
  World,
} from '~/shared/types'
import { isYearStart } from '~/engine/calendar'
import { nextRng } from '~/engine/random'
import {
  M41_AI_PERSONALITY_REFORM_PROPENSITY,
  M41_REFORMER_GRACE_PERIOD_YEARS,
  M41_REFORM_FAILED_SCAR_TRAIT,
  M42_FACTION_REFORM_BLOCK_THRESHOLD,
} from '~/content/m2/balance'
import { ReformDefinitionSchema } from '~/shared/schemas'
import { evaluatePredicate } from './predicate'
import { applyReformChoice, completeReform } from './stage-progression'
import shangYangJson from '~/content/m4_1/reforms/shang-yang.json'
import wuQiJson from '~/content/m4_1/reforms/wu-qi.json'
import huFuQiSheJson from '~/content/m4_1/reforms/hu-fu-qi-she.json'
import chuWuQiLegacyJson from '~/content/m4_1/reforms/chu-wu-qi-legacy.json'
import qiJixiaDebateJson from '~/content/m4_1/reforms/qi-jixia-debate.json'
import hanShenBuhaiJson from '~/content/m4_1/reforms/han-shen-buhai-restart.json'

const REFORMIST_REFORM_IDS: ReadonlySet<ReformId> = new Set([
  'shang_yang',
  'wu_qi',
  'hu_fu_qi_she',
  'chu_wu_qi_legacy',
  'han_shen_buhai_restart',
])

const TICKS_PER_MONTH = 3
const TICKS_PER_YEAR = 36

const REFORM_DEFINITIONS: readonly ReformDefinition[] = [
  shangYangJson,
  wuQiJson,
  huFuQiSheJson,
  chuWuQiLegacyJson,
  qiJixiaDebateJson,
  hanShenBuhaiJson,
].map(json => ReformDefinitionSchema.parse(json))

function loadReformDefinitions(): readonly ReformDefinition[] {
  return REFORM_DEFINITIONS
}

function handleActiveReform(
  world: World,
  realmId: string,
  activeState: ReformState,
  reformDefs: readonly ReformDefinition[],
): { world: World; events: GameEvent[] } {
  const hasReformer = [...world.generals.values()].some(
    (g) => g.realmId === realmId && g.specialty === 'reformer',
  )

  if (!hasReformer) {
    const ticksSinceStageEntered = world.tick - activeState.stageEnteredAtTick
    const gracePeriodTicks = M41_REFORMER_GRACE_PERIOD_YEARS * TICKS_PER_YEAR

    if (ticksSinceStageEntered > gracePeriodTicks) {
      const reformDef = reformDefs.find((d) => d.id === activeState.reformId)
      if (reformDef) {
        return completeReform(world, realmId, reformDef, false)
      }
      return { world, events: [] }
    }

    const pausedState: ReformState = { ...activeState, status: 'paused' }
    const reformStates = new Map(world.reformStates)
    reformStates.set(realmId, pausedState)
    return { world: { ...world, reformStates }, events: [] }
  }

  const reformDef = reformDefs.find((d) => d.id === activeState.reformId)
  if (!reformDef) return { world, events: [] }

  const stage = reformDef.stages.find((s) => s.id === activeState.currentStageId)
  if (!stage) return { world, events: [] }

  const ticksInStage = world.tick - activeState.stageEnteredAtTick
  const advanceTicks = stage.advanceAfterMonths * TICKS_PER_MONTH
  if (ticksInStage < advanceTicks) return { world, events: [] }

  const defaultChoice = stage.choices[0]
  if (!defaultChoice) return { world, events: [] }

  return applyReformChoice(world, realmId, reformDef, defaultChoice.id)
}

function tryAITrigger(
  world: World,
  rng: RNGState,
  realmId: string,
  reformDefs: readonly ReformDefinition[],
): { world: World; nextRng: RNGState; events: GameEvent[] } {
  const realm = world.realms.get(realmId)
  if (!realm) return { world, nextRng: rng, events: [] }

  if (realm.traits.includes(M41_REFORM_FAILED_SCAR_TRAIT)) {
    return { world, nextRng: rng, events: [] }
  }

  const ruler = world.rulers.get(realmId)
  if (!ruler) return { world, nextRng: rng, events: [] }

  const propensity = M41_AI_PERSONALITY_REFORM_PROPENSITY[ruler.personality] ?? 0
  if (propensity === 0) return { world, nextRng: rng, events: [] }

  const sortedDefs = [...reformDefs].sort((a, b) => a.id.localeCompare(b.id))

  let currentWorld = world
  let currentRng = rng
  const events: GameEvent[] = []

  for (const def of sortedDefs) {
    if (!evaluatePredicate(currentWorld, realm, def.trigger)) continue

    if (REFORMIST_REFORM_IDS.has(def.id)) {
      const factionState = currentWorld.factionInfluences.get(realmId)
      const conservativeInfluence = factionState?.influences.get('conservatives') ?? 0
      if (conservativeInfluence > M42_FACTION_REFORM_BLOCK_THRESHOLD) continue
    }

    const { value, nextState } = nextRng(currentRng)
    currentRng = nextState

    if (value < propensity) {
      const firstStage = def.stages[0]
      if (!firstStage) continue
      const newState: ReformState = {
        realmId,
        reformId: def.id,
        currentStageId: firstStage.id,
        startedAtTick: currentWorld.tick,
        stageEnteredAtTick: currentWorld.tick,
        status: 'in_progress',
        choiceHistory: [],
      }
      const reformStates = new Map(currentWorld.reformStates)
      reformStates.set(realmId, newState)
      currentWorld = { ...currentWorld, reformStates }
      events.push({ type: 'reformStarted', payload: { realmId, reformId: def.id } })
      break
    }
  }

  return { world: currentWorld, nextRng: currentRng, events }
}

export function reformPhase(
  world: World,
  rng: RNGState,
  reformDefs: readonly ReformDefinition[] = loadReformDefinitions(),
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (!isYearStart(world)) {
    return { world, nextRng: rng, events: [] }
  }

  const sortedRealmIds = [...world.realms.keys()].sort((a, b) => a.localeCompare(b))

  let currentWorld = world
  let currentRng = rng
  const events: GameEvent[] = []

  for (const realmId of sortedRealmIds) {
    const activeState = currentWorld.reformStates.get(realmId)
    if (activeState?.status === 'in_progress') {
      const result = handleActiveReform(currentWorld, realmId, activeState, reformDefs)
      currentWorld = result.world
      events.push(...result.events)
      continue
    }

    if (realmId === currentWorld.playerRealmId) continue

    const triggerResult = tryAITrigger(currentWorld, currentRng, realmId, reformDefs)
    currentWorld = triggerResult.world
    currentRng = triggerResult.nextRng
    events.push(...triggerResult.events)
  }

  return { world: currentWorld, nextRng: currentRng, events }
}
