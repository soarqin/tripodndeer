import type { GameEvent, Realm, RNGState, World } from '~/shared/types'
import type { AIState, OperationalDirective } from '~/shared/types/ai-state'
import { M8_1_OPERATIONAL_WEIGHTS } from '~/content/m2/balance/m8_1'
import { nextRng } from '~/engine/random'
import { isAtWar } from '~/engine/wars'
import { runDiplomacyForRealm, runEspionageForRealm } from './ai'
import {
  createAiTickContext,
  worldWithAiTickContext,
} from './internal/tick-context'
import { getPersonality } from './utility-scorer'

const MAX_NEW_DIRECTIVES = 3
const OPERATIONAL_GATE = 0.2

function retainedDirectives(
  directives: readonly OperationalDirective[],
  tick: number
): OperationalDirective[] {
  return directives.filter((directive) => directive.expiresAtTick >= tick)
}

function directiveKey(directive: OperationalDirective): string {
  return `${directive.kind}:${directive.targetRealmId ?? ''}`
}

function mergeDirectives(
  retained: readonly OperationalDirective[],
  generated: readonly OperationalDirective[]
): readonly OperationalDirective[] {
  const merged = new Map<string, OperationalDirective>()
  for (const directive of retained) merged.set(directiveKey(directive), directive)
  for (const directive of generated) merged.set(directiveKey(directive), directive)
  return [...merged.values()]
}

function buildDirectivesForRealm(
  world: World,
  realm: Realm,
  aiState: AIState
): readonly OperationalDirective[] {
  const plan = aiState.strategic
  if (!plan) return []

  const weights = M8_1_OPERATIONAL_WEIGHTS[getPersonality(world, realm.id)]
  const expiresAtTick = world.tick + Math.floor(3 * weights.directiveExpiryBias)
  const candidates: OperationalDirective[] = []

  if (plan.mainEnemyRealmId && !isAtWar(world.wars, realm.id, plan.mainEnemyRealmId)) {
    candidates.push({
      id: `${realm.id}:${world.tick}:declare_war:${plan.mainEnemyRealmId}`,
      kind: 'declare_war',
      priority: weights.warDeclarationBias * 10,
      targetRealmId: plan.mainEnemyRealmId,
      createdAtTick: world.tick,
      expiresAtTick,
    })
  }

  if (plan.targetSiteId && plan.mainEnemyRealmId && isAtWar(world.wars, realm.id, plan.mainEnemyRealmId)) {
    candidates.push({
      id: `${realm.id}:${world.tick}:dispatch_army:${plan.targetSiteId}`,
      kind: 'dispatch_army',
      priority: weights.dispatchPriorityBias * 10,
      targetRealmId: plan.mainEnemyRealmId,
      targetSiteId: plan.targetSiteId,
      createdAtTick: world.tick,
      expiresAtTick,
    })
  }

  if (plan.mainAllyRealmId && !isAtWar(world.wars, realm.id, plan.mainAllyRealmId)) {
    candidates.push({
      id: `${realm.id}:${world.tick}:diplomacy:${plan.mainAllyRealmId}`,
      kind: 'diplomacy',
      priority: weights.diplomacyInitiative * 10,
      targetRealmId: plan.mainAllyRealmId,
      createdAtTick: world.tick,
      expiresAtTick,
    })
  }

  return candidates
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, MAX_NEW_DIRECTIVES)
}

export function aiOperationalStep(
  world: World,
  rng: RNGState
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  if (world.date.xun !== 'shang') {
    return { world, nextRng: rng, events: [] }
  }

  const events: GameEvent[] = []
  let currentRng = rng
  let tickContext = createAiTickContext(world)
  const newAiState = new Map(world.aiState)

  for (const realm of [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (realm.id === world.playerRealmId) continue
    if (realm.status === 'deactivated') continue

    const diplomacy = runDiplomacyForRealm(world, realm, tickContext, currentRng)
    tickContext = diplomacy.ctx
    events.push(...diplomacy.events)

    const espionage = runEspionageForRealm(world, realm, tickContext, currentRng)
    tickContext = espionage.ctx
    events.push(...espionage.events)
    currentRng = espionage.nextRng

    const roll = nextRng(currentRng)
    currentRng = roll.nextState
    if (roll.value >= OPERATIONAL_GATE) continue

    const existingAiState = newAiState.get(realm.id) ?? { strategic: null, operational: [] }
    const retained = retainedDirectives(existingAiState.operational, world.tick)
    const generated = buildDirectivesForRealm(world, realm, existingAiState)
    newAiState.set(realm.id, {
      strategic: existingAiState.strategic,
      operational: mergeDirectives(retained, generated),
    })
  }

  return {
    world: { ...worldWithAiTickContext(world, tickContext), aiState: newAiState },
    nextRng: currentRng,
    events,
  }
}
