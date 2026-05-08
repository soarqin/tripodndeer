import type { Army, ArmyId, World } from '~/shared/types'

export interface AiTickContext {
  readonly armies: Map<ArmyId, Army>
  readonly sieges: World['sieges']
  readonly sites: World['sites']
  readonly wars: World['wars']
  readonly relations: World['relations']
  readonly diplomaticProposals: World['diplomaticProposals']
  readonly treaties: World['treaties']
  readonly diplomacyHistory: World['diplomacyHistory']
  readonly coalitions: World['coalitions']
  readonly spyMissions: World['spyMissions']
}

export function createAiTickContext(world: World): AiTickContext {
  return {
    armies: new Map(world.armies),
    sieges: new Map(world.sieges),
    sites: new Map(world.sites),
    wars: world.wars,
    relations: world.relations,
    diplomaticProposals: world.diplomaticProposals,
    treaties: world.treaties,
    diplomacyHistory: world.diplomacyHistory,
    coalitions: world.coalitions,
    spyMissions: world.spyMissions,
  }
}

export function worldWithAiTickContext(
  world: World,
  tickContext: AiTickContext
): World {
  return {
    ...world,
    armies: tickContext.armies,
    sieges: tickContext.sieges,
    sites: tickContext.sites,
    wars: tickContext.wars,
    relations: tickContext.relations,
    diplomaticProposals: tickContext.diplomaticProposals,
    treaties: tickContext.treaties,
    diplomacyHistory: tickContext.diplomacyHistory,
    coalitions: tickContext.coalitions,
    spyMissions: tickContext.spyMissions,
  }
}

export function tickContextWithDiplomacyResult(
  tickContext: AiTickContext,
  world: World
): AiTickContext {
  return {
    ...tickContext,
    wars: world.wars,
    relations: world.relations,
    diplomaticProposals: world.diplomaticProposals,
    treaties: world.treaties,
    diplomacyHistory: world.diplomacyHistory,
    coalitions: world.coalitions,
  }
}

export function tickContextWithEspionageResult(
  tickContext: AiTickContext,
  world: World
): AiTickContext {
  return {
    ...tickContext,
    spyMissions: world.spyMissions,
  }
}

export function tickContextWithBattlefieldResult(
  tickContext: AiTickContext,
  world: World
): AiTickContext {
  return {
    ...tickContext,
    armies: new Map(world.armies),
    sieges: new Map(world.sieges),
    sites: new Map(world.sites),
  }
}
