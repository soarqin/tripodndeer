import type { Army, ArmyId, World } from '~/shared/types'

export interface AiPhaseState {
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

export function createAiPhaseState(world: World): AiPhaseState {
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

export function worldWithAiPhaseState(
  world: World,
  phaseState: AiPhaseState
): World {
  return {
    ...world,
    armies: phaseState.armies,
    sieges: phaseState.sieges,
    sites: phaseState.sites,
    wars: phaseState.wars,
    relations: phaseState.relations,
    diplomaticProposals: phaseState.diplomaticProposals,
    treaties: phaseState.treaties,
    diplomacyHistory: phaseState.diplomacyHistory,
    coalitions: phaseState.coalitions,
    spyMissions: phaseState.spyMissions,
  }
}

export function phaseStateWithDiplomacyResult(
  phaseState: AiPhaseState,
  world: World
): AiPhaseState {
  return {
    ...phaseState,
    wars: world.wars,
    relations: world.relations,
    diplomaticProposals: world.diplomaticProposals,
    treaties: world.treaties,
    diplomacyHistory: world.diplomacyHistory,
    coalitions: world.coalitions,
  }
}

export function phaseStateWithEspionageResult(
  phaseState: AiPhaseState,
  world: World
): AiPhaseState {
  return {
    ...phaseState,
    spyMissions: world.spyMissions,
  }
}

export function phaseStateWithBattlefieldResult(
  phaseState: AiPhaseState,
  world: World
): AiPhaseState {
  return {
    ...phaseState,
    armies: new Map(world.armies),
    sieges: new Map(world.sieges),
    sites: new Map(world.sites),
  }
}
