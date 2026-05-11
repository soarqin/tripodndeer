import type { AIState } from './ai-state'
import type { General, GeneralId, FactionId, RulerPersonalityProfile, RulerState } from './character'
import type { AdjacencyEdge, AdjacencyEdgeId, Army, ArmyId, EdgeId, MapEdge, RealmId, Site, SiteId } from './core'
import type { DifficultyTier } from './difficulty'
import type { ScenarioId } from './scenario'
import type {
  CoalitionId,
  CoalitionState,
  DiplomaticProposal,
  DiplomaticProposalId,
  DiplomaticRelation,
  DiplomacyEvent,
  PeaceProposal,
  PeaceProposalId,
  RelationKey,
  Siege,
  SiegeId,
  Treaty,
  TreatyId,
  WarKey,
  WarState,
  ZhouInvestitureState,
} from './diplomacy'
import type { EdictId, EdictState, GovernorAssignment, Order } from './economy'
import type { CounterIntelState, CoverageKey, SpyMission, SpyMissionId } from './espionage'
import type { EventChainId, EventChainState } from './events'
import type { DisasterState, ReformState, TradeRoute, TradeRouteId } from './reform-disaster-trade'
import type { DiplomaticMemory, MemoryKey } from './diplomatic-memory'
import type { PanelId, TutorialStepId } from './tutorial'
import type {
  Academy,
  AcademyId,
  CharId,
  CharacterTemplate,
  GameDate,
  Pass,
  PassId,
  Province,
  ProvinceId,
  Realm,
  Region,
  RegionId,
  RNGState,
} from './world'

export const SAVE_DTO_VERSION = 5 as const

export type SaveLoadErrorKind = 'incompatible_version' | 'parse_error' | 'missing_data'

export interface SaveLoadError {
  readonly kind: SaveLoadErrorKind
  readonly message: string
  readonly got?: number
  readonly expected?: number
}

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export interface SerializedFactionInfluence {
  readonly realmId: RealmId
  readonly influences: [FactionId, number][]
}

export interface SerializedRulerState extends Omit<RulerState, 'personalityDims'> {
  readonly personalityDims?: RulerPersonalityProfile
}

export interface TutorialStateDTO {
  readonly currentStep: TutorialStepId | null
  readonly completedSteps: readonly TutorialStepId[]
  readonly startedAt: GameDate
  readonly dismissedStepHints: readonly TutorialStepId[]
  readonly panelsOpened: readonly PanelId[]
  readonly timeoutHintShown: boolean
}

export interface SerializedWorld {
  readonly date: GameDate
  readonly tick: number
  readonly difficulty?: DifficultyTier
  readonly sites: [SiteId, Site][]
  readonly realms: [RealmId, Realm][]
  readonly armies: [ArmyId, Army][]
  readonly edges: [EdgeId, MapEdge][]
  readonly wars: [WarKey, WarState][]
  readonly peaceProposals: [PeaceProposalId, PeaceProposal][]
  readonly relations: [RelationKey, DiplomaticRelation][]
  readonly diplomaticProposals: [DiplomaticProposalId, DiplomaticProposal][]
  readonly treaties: [TreatyId, Treaty][]
  readonly diplomacyHistory: readonly DiplomacyEvent[]
  readonly diplomaticMemory?: [MemoryKey, DiplomaticMemory][]
  readonly coalitions: [CoalitionId, CoalitionState][]
  readonly zhouInvestiture: [RealmId, ZhouInvestitureState][]
  readonly generals: [GeneralId, General][]
  readonly rulers: [RealmId, SerializedRulerState][]
  readonly academies: [AcademyId, Academy][]
  readonly eventChainStates: [EventChainId, EventChainState][]
  readonly reformStates: [RealmId, ReformState][]
  readonly disasterStates: [RealmId, DisasterState][]
  readonly tradeRoutes: [TradeRouteId, TradeRoute][]
  readonly factionInfluences: [RealmId, SerializedFactionInfluence][]
  readonly passes: [PassId, Pass][]
  readonly adjacencyEdges: [AdjacencyEdgeId, AdjacencyEdge][]
  readonly sieges: [SiegeId, Siege][]
  readonly edicts: [EdictId, EdictState][]
  readonly governorAssignments: [SiteId, GovernorAssignment][]
  readonly intelligenceCoverage: [CoverageKey, number][]
  readonly spyMissions: [SpyMissionId, SpyMission][]
  readonly counterIntelStates: [RealmId, CounterIntelState][]
  readonly provinces: [ProvinceId, Province][]
  readonly regions: [RegionId, Region][]
  readonly characterTemplates: [CharId, CharacterTemplate][]
  readonly localization: [string, string][]
  readonly playerRealmId: RealmId
  readonly rngState: RNGState
  readonly pendingOrders: readonly Order[]
  readonly aiState?: readonly [RealmId, AIState][]
}

export interface SaveDTO {
  readonly schemaVersion: typeof SAVE_DTO_VERSION
  readonly scenarioId: ScenarioId
  readonly createdAt: number
  readonly world: SerializedWorld
  readonly seenHints?: Readonly<Record<string, true>>
  readonly hintsEnabled?: boolean
  readonly tutorialState?: TutorialStateDTO | null
}

export type SaveDTOAnyVersion = Omit<SaveDTO, 'schemaVersion'> & { readonly schemaVersion: number }
