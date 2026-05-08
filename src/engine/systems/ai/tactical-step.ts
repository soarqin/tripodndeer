import type { GameEvent, RealmId, RNGState, World } from '~/shared/types'
import type { OperationalDirective } from '~/shared/types/ai-state'
import { isAtWar } from '~/engine/wars'
import type { AIOption } from './utility-scorer'
import { getPersonality, pickAction } from './utility-scorer'
import {
  type AiTickContext,
  createAiTickContext,
  worldWithAiTickContext,
} from './internal/tick-context'
import { applyTacticalAction, collectTacticalOptions } from './internal/tactical'

type DroppedDirective = { id: string; reason: string }

function directiveAllowsTacticalOption(
  directive: OperationalDirective,
  option: AIOption
): boolean {
  if (directive.kind === 'dispatch_army' && directive.armyId) {
    return option.armyId === directive.armyId
  }
  if (directive.kind === 'support_front' && directive.targetSiteId) {
    return option.targetSiteId === directive.targetSiteId
  }
  if (directive.kind === 'retreat' && directive.armyId) {
    return option.kind === 'retreat' && option.armyId === directive.armyId
  }
  return false
}

function boundedTacticalOptions(
  world: World,
  tickContext: AiTickContext,
  realmId: RealmId,
  directives: readonly OperationalDirective[]
): AIOption[] {
  const options = collectTacticalOptions(world, tickContext, realmId)
  return options.filter((option) =>
    directives.some((directive) => directiveAllowsTacticalOption(directive, option))
  )
}

function dropReason(
  world: World,
  realmId: RealmId,
  directive: OperationalDirective
): string | null {
  if (directive.expiresAtTick < world.tick) return 'expired'
  if (directive.armyId && !world.armies.has(directive.armyId)) return 'army_gone'

  if (directive.targetSiteId) {
    const ownerId = world.sites.get(directive.targetSiteId)?.ownerId
    if (ownerId === realmId || ownerId === world.playerRealmId) {
      return 'objective_achieved'
    }
  }

  if (
    directive.kind === 'declare_war' &&
    directive.targetRealmId &&
    isAtWar(world.wars, realmId, directive.targetRealmId)
  ) {
    return 'war_active'
  }

  if (
    directive.targetRealmId &&
    world.realms.get(directive.targetRealmId)?.status === 'deactivated'
  ) {
    return 'target_deactivated'
  }

  return null
}

export function cleanseDirectives(
  world: World,
  realmId: RealmId,
  directives: readonly OperationalDirective[]
): { active: readonly OperationalDirective[]; dropped: DroppedDirective[] } {
  const active: OperationalDirective[] = []
  const dropped: DroppedDirective[] = []

  for (const directive of directives) {
    const reason = dropReason(world, realmId, directive)
    if (reason) {
      dropped.push({ id: directive.id, reason })
    } else {
      active.push(directive)
    }
  }

  return { active, dropped }
}

export function aiTacticalStep(
  world: World,
  rng: RNGState
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  let currentRng = rng
  let tickContext = createAiTickContext(world)
  const newAiState = new Map(world.aiState)
  let currentWorld: World = world

  for (const realm of [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (realm.id === world.playerRealmId) continue
    if (realm.status === 'deactivated') continue

    const existingAiState = newAiState.get(realm.id) ?? {
      strategic: null,
      operational: [],
    }
    const lifecycle = cleanseDirectives(
      currentWorld,
      realm.id,
      existingAiState.operational
    )
    if (lifecycle.dropped.length > 0) {
      newAiState.set(realm.id, {
        ...existingAiState,
        operational: lifecycle.active,
      })
      currentWorld = { ...currentWorld, aiState: newAiState }
      for (const dropped of lifecycle.dropped) {
        events.push({
          type: 'ai_directive_dropped',
          payload: {
            realmId: realm.id,
            directiveId: dropped.id,
            reason: dropped.reason,
          },
        })
      }
    }

    const directives = lifecycle.active
    if (directives.length === 0) continue

    const options = boundedTacticalOptions(
      currentWorld,
      tickContext,
      realm.id,
      directives
    )
    if (options.length === 0) continue

    const personality = getPersonality(world, realm.id)
    const { action, nextRng } = pickAction(options, personality, currentRng)
    currentRng = nextRng

    if (action.kind === 'idle') continue
    if (!action.targetSiteId || !action.armyId) continue

    const result = applyTacticalAction(currentWorld, tickContext, realm.id, action)
    tickContext = result.tickContext
    events.push(...result.events)
  }

  return {
    world: { ...worldWithAiTickContext(currentWorld, tickContext), aiState: newAiState },
    nextRng: currentRng,
    events,
  }
}
