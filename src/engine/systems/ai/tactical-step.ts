import type { GameEvent, RealmId, RNGState, World } from '~/shared/types'
import type { OperationalDirective } from '~/shared/types/ai-state'
import type { AIOption } from './utility-scorer'
import { getPersonality, pickAction } from './utility-scorer'
import {
  createAiTickContext,
  worldWithAiTickContext,
} from './internal/tick-context'
import { applyTacticalAction, collectTacticalOptions } from './internal/tactical'

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
  tickContext: ReturnType<typeof createAiTickContext>,
  realmId: RealmId,
  directives: readonly OperationalDirective[]
): AIOption[] {
  const options = collectTacticalOptions(world, tickContext, realmId)
  return options.filter((option) =>
    directives.some((directive) => directiveAllowsTacticalOption(directive, option))
  )
}

export function aiTacticalStep(
  world: World,
  rng: RNGState
): { world: World; nextRng: RNGState; events: readonly GameEvent[] } {
  const events: GameEvent[] = []
  let currentRng = rng
  let tickContext = createAiTickContext(world)

  for (const realm of [...world.realms.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (realm.id === world.playerRealmId) continue
    if (realm.status === 'deactivated') continue

    const directives = world.aiState.get(realm.id)?.operational ?? []
    if (directives.length === 0) continue

    const options = boundedTacticalOptions(
      world,
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

    const result = applyTacticalAction(world, tickContext, realm.id, action)
    tickContext = result.tickContext
    events.push(...result.events)
  }

  return {
    world: worldWithAiTickContext(world, tickContext),
    nextRng: currentRng,
    events,
  }
}
