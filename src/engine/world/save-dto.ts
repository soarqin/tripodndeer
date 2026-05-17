import { M5_PERSONALITY_DIMS_BASELINE } from '~/content/m2/balance'
import type { ScenarioId } from '~/shared'
import type { FactionId, FactionInfluenceState, IntelligenceCoverage, RulerState, World } from '~/shared/types'
import type { TutorialState } from '~/shared/types/tutorial'
import {
  SAVE_DTO_VERSION,
  type Result,
  type SaveDTO,
  type SaveDTOAnyVersion,
  type SaveLoadError,
  type TutorialStateDTO,
} from '~/shared/types/save-dto'
import { getDefaultPhases } from './factory'

function serializeTutorialState(state: TutorialState): TutorialStateDTO {
  return {
    currentStep: state.currentStep,
    completedSteps: [...state.completedSteps],
    startedAt: state.startedAt,
    dismissedStepHints: [...state.dismissedStepHints],
    panelsOpened: [...state.panelsOpened],
    timeoutHintShown: state.timeoutHintShown,
  }
}

function deserializeTutorialState(dto: TutorialStateDTO): TutorialState {
  return {
    currentStep: dto.currentStep,
    completedSteps: new Set(dto.completedSteps),
    startedAt: dto.startedAt,
    dismissedStepHints: new Set(dto.dismissedStepHints),
    panelsOpened: new Set(dto.panelsOpened),
    timeoutHintShown: dto.timeoutHintShown,
  }
}

export function worldToSaveDTO(
  world: World,
  scenarioId: ScenarioId = 'm1',
  hintState?: HintSaveState,
): SaveDTO {
  return {
    schemaVersion: SAVE_DTO_VERSION,
    scenarioId: world.scenarioId ?? scenarioId,
    createdAt: Date.now(),
    tutorialState: world.tutorialState ? serializeTutorialState(world.tutorialState) : null,
    seenHints: hintState?.seenHints ?? {},
    hintsEnabled: hintState?.hintsEnabled ?? true,
    world: {
      date: world.date,
      tick: world.tick,
      difficulty: world.difficulty,
      sites: [...world.sites.entries()],
      realms: [...world.realms.entries()],
      armies: [...world.armies.entries()],
      edges: [...world.edges.entries()],
      wars: [...world.wars.entries()],
      peaceProposals: [...world.peaceProposals.entries()],
      relations: [...world.relations.entries()],
      diplomaticProposals: [...world.diplomaticProposals.entries()],
      treaties: [...world.treaties.entries()],
      diplomacyHistory: [...world.diplomacyHistory],
      diplomaticMemory: [...world.diplomaticMemory.entries()],
      coalitions: [...world.coalitions.entries()],
      zhouInvestiture: [...world.zhouInvestiture.entries()],
      generals: [...world.generals.entries()],
      rulers: [...world.rulers.entries()].map(([realmId, ruler]) => [
        realmId,
        { ...ruler, personalityDims: ruler.personalityDims },
      ]),
      academies: [...world.academies.entries()],
      eventChainStates: [...world.eventChainStates.entries()],
      reformStates: [...world.reformStates.entries()],
      disasterStates: [...world.disasterStates.entries()],
      tradeRoutes: [...world.tradeRoutes.entries()],
      factionInfluences: [...world.factionInfluences.entries()].map(([key, value]) => [
        key,
        { realmId: value.realmId, influences: [...value.influences.entries()] },
      ]),
      passes: [...world.passes.entries()],
      adjacencyEdges: [...world.adjacencyEdges.entries()],
      sieges: [...world.sieges.entries()],
      edicts: [...world.edicts.entries()],
      governorAssignments: [...world.governorAssignments.entries()],
      intelligenceCoverage: [...world.intelligenceCoverage.entries()],
      spyMissions: [...world.spyMissions.entries()],
      counterIntelStates: [...world.counterIntelStates.entries()],
      provinces: [...world.provinces.entries()],
      regions: [...world.regions.entries()],
      characterTemplates: [...world.characterTemplates.entries()],
      localization: [...world.localization.entries()],
      playerRealmId: world.playerRealmId,
      rngState: world.rngState,
      pendingOrders: [...world.pendingOrders],
      aiState: [...world.aiState.entries()],
    },
  }
}

export const SUPPORTED_SAVE_DTO_VERSIONS: readonly number[] = [5]

export function saveDtoToWorld(dto: SaveDTO): Result<World, SaveLoadError> {
  const inputDto = dto as SaveDTOAnyVersion
  if (!SUPPORTED_SAVE_DTO_VERSIONS.includes(inputDto.schemaVersion)) {
    return {
      ok: false,
      error: {
        kind: 'incompatible_version',
        message: `Unsupported SaveDTO version: ${inputDto.schemaVersion}`,
        got: inputDto.schemaVersion,
        expected: SAVE_DTO_VERSION,
      },
    }
  }

  const sw = inputDto.world
  const factionInfluences = new Map(
    sw.factionInfluences.map(([key, value]): [string, FactionInfluenceState] => [
      key,
      {
        realmId: value.realmId,
        influences: new Map<FactionId, number>(value.influences),
      },
    ]),
  )
  const intelligenceCoverage: IntelligenceCoverage = new Map(sw.intelligenceCoverage)
  const rulers = new Map(
    sw.rulers.map(([realmId, ruler]): [string, RulerState] => [
      realmId,
      {
        ...ruler,
        personalityDims: ruler.personalityDims ?? M5_PERSONALITY_DIMS_BASELINE[ruler.personality],
      },
    ]),
  )

  return {
    ok: true,
    value: {
      date: sw.date,
      tick: sw.tick,
      difficulty: sw.difficulty ?? 'hero',
      sites: new Map(sw.sites),
      realms: new Map(sw.realms),
      armies: new Map(sw.armies),
      edges: new Map(sw.edges),
      wars: new Map(sw.wars),
      peaceProposals: new Map(sw.peaceProposals),
      relations: new Map(sw.relations),
      diplomaticProposals: new Map(sw.diplomaticProposals),
      treaties: new Map(sw.treaties),
      diplomacyHistory: sw.diplomacyHistory,
      coalitions: new Map(sw.coalitions),
      zhouInvestiture: new Map(sw.zhouInvestiture),
      generals: new Map(sw.generals),
      rulers,
      academies: new Map(sw.academies),
      eventChainStates: new Map(sw.eventChainStates),
      reformStates: new Map(sw.reformStates),
      disasterStates: new Map(sw.disasterStates),
      tradeRoutes: new Map(sw.tradeRoutes),
      factionInfluences,
      passes: new Map(sw.passes),
      adjacencyEdges: new Map(sw.adjacencyEdges),
      sieges: new Map(sw.sieges),
      edicts: new Map(sw.edicts),
      governorAssignments: new Map(sw.governorAssignments),
      intelligenceCoverage,
      spyMissions: new Map(sw.spyMissions),
      counterIntelStates: new Map(sw.counterIntelStates),
      provinces: new Map(sw.provinces),
      regions: new Map(sw.regions),
      characterTemplates: new Map(sw.characterTemplates),
      localization: new Map(sw.localization),
      aiState: new Map(sw.aiState ?? []),
      diplomaticMemory: new Map(sw.diplomaticMemory ?? []),
      playerRealmId: sw.playerRealmId,
      scenarioId: inputDto.scenarioId,
      tutorialState: inputDto.tutorialState
        ? deserializeTutorialState(inputDto.tutorialState)
        : null,
      rngState: sw.rngState,
      phases: getDefaultPhases(),
      pendingOrders: sw.pendingOrders,
    },
  }
}

export interface HintSaveState {
  readonly seenHints: Readonly<Record<string, true>>
  readonly hintsEnabled: boolean
}

export function saveDtoToHintState(dto: SaveDTO): HintSaveState {
  return {
    seenHints: dto.seenHints ? { ...dto.seenHints } : {},
    hintsEnabled: dto.hintsEnabled ?? true,
  }
}
