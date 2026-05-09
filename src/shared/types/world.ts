import type { AIState } from './ai-state'
import type { DifficultyTier } from './difficulty'
import type {
  RealmId,
  SiteId,
  ArmyId,
  EdgeId,
  AdjacencyEdgeId,
  MapEdge,
  Site,
  Army,
  ArmyTemplate,
  AdjacencyEdge,
  RawSite,
} from './core'
import type {
  GeneralId,
  General,
  RulerState,
} from './character'
import type {
  EdictId,
  EdictState,
  GovernorAssignment,
  RealmEconomy,
  Order,
} from './economy'
import type {
  WarKey,
  WarState,
  PeaceProposalId,
  PeaceProposal,
  RelationKey,
  DiplomaticRelation,
  DiplomaticProposalId,
  DiplomaticProposal,
  TreatyId,
  Treaty,
  DiplomacyEvent,
  CoalitionId,
  CoalitionState,
  ZhouInvestitureState,
  SiegeId,
  Siege,
} from './diplomacy'
import type {
  SpyMissionId,
  SpyMission,
  CounterIntelState,
  IntelligenceCoverage,
} from './espionage'
import type {
  EventChainId,
  EventChainState,
  GameEvent,
  PoliticalSystem,
} from './events'
import type {
  ReformState,
  DisasterState,
  TradeRouteId,
  TradeRoute,
  FactionInfluenceState,
} from './reform-disaster-trade'
import type { MemoryKey, DiplomaticMemory } from './diplomatic-memory'
import type { CharacterAttributes, Specialty } from './character'

export type PassId = string
export type ProvinceId = string
export type RegionId = string
export type CharId = string
export type LocaleString = string
export type RealmStatus = 'active' | 'deactivated'

export type CulturalTag =
  | 'chinese_qin'
  | 'chinese_chu'
  | 'chinese_qi'
  | 'chinese_zhou_central'
  | 'chinese_yan'
  | 'chinese_zhao'
  | 'chinese_wei'
  | 'chinese_han'
  | 'yi_dong'
  | 'di_xirong'

export type Ideology = 'fa' | 'ru' | 'dao' | 'mo' | 'zonghen' | 'bing'

export type IdeologyLean = Readonly<Record<Ideology, number>>

export type AcademyId = string

export type AcademyStatus = 'active' | 'dormant'

export interface Academy {
  readonly id: AcademyId
  readonly hostRealmId: RealmId
  readonly hostSiteId: SiteId
  readonly primaryIdeology: Ideology
  readonly secondaryIdeology: Ideology | null
  readonly founded: number
  readonly level: 1
  readonly status: AcademyStatus
}

export interface RealmStats {
  manpowerPool: number
  manpowerCap: number
  warWeariness: number
}

export interface Pass {
  id: PassId
  name: string
  edgeId: AdjacencyEdgeId
  defenseBonus: number
  controllerId: RealmId
  fortification: number
}

// Realm definition (id=opaque, color=CSS string)
export interface Realm {
  readonly id: RealmId
  readonly displayName: string
  readonly fullTitle: string
  readonly color: string // e.g. '#dc2626'
  readonly capital: SiteId
  readonly initialSites: readonly SiteId[]
  readonly initialArmies: readonly ArmyTemplate[]
  readonly economy: RealmEconomy
  readonly stats?: RealmStats
  readonly rulerId?: GeneralId | null
  readonly traits: readonly string[]
  readonly politicalSystem: PoliticalSystem
  readonly prestige?: number
  readonly ideologyLean?: IdeologyLean
  readonly warVictoriesThisYear?: number
  readonly status?: RealmStatus
  readonly rulingHouse?: string
}

// 游戏日期（旬为最小单位）
export interface GameDate {
  yearBC: number // 正数=公元前, -1=AD 1（无零年）
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  month: 1 | 2 | 3 // 季内子月 (1-3)
  xun: 'shang' | 'zhong' | 'xia' // 上/中/下旬
}

// PRNG 状态（Mulberry32 可序列化）
export interface RNGState {
  seed: number
  counter: number
}

// ─── M9 Warring States Content: Province / Region / CharacterTemplate ──────

export interface Province {
  readonly id: ProvinceId
  readonly name: string
  readonly regionId: RegionId
  readonly realmId: RealmId
  readonly siteIds: readonly SiteId[]
  readonly historicalCapital?: SiteId
  readonly historicalNotes: string
}

export interface Region {
  readonly id: RegionId
  readonly name: string
  readonly description?: string
  readonly provinceIds: readonly ProvinceId[]
}

export interface CharacterTemplate {
  readonly id: CharId
  readonly givenName: string
  readonly familyName: string
  readonly realmId: RealmId
  readonly birthYearBC: number
  readonly deathYearBC: number | null
  readonly birthplace: SiteId | string
  readonly specialty: Specialty
  readonly attributes: CharacterAttributes
  readonly historicalNotes: string
  readonly source: '史记' | '战国策' | '左传' | '其他' | 'approximated'
  readonly aliases?: readonly string[]
}

// 时间速度档位
export type SpeedTier = 'pause' | '1x' | '2x' | '3x' | '4x' | '5x'

// Tick 阶段函数签名
export type TickPhase = (
  world: World,
  rng: RNGState,
) => { world: World; nextRng: RNGState; events: readonly GameEvent[] }

// 世界状态（核心数据结构）
export interface World {
  date: GameDate
  tick: number
  sites: ReadonlyMap<SiteId, Site>
  realms: ReadonlyMap<RealmId, Realm>
  armies: ReadonlyMap<ArmyId, Army>
  edges: ReadonlyMap<EdgeId, MapEdge>
  wars: ReadonlyMap<WarKey, WarState>
  peaceProposals: ReadonlyMap<PeaceProposalId, PeaceProposal>
  relations: ReadonlyMap<RelationKey, DiplomaticRelation>
  diplomaticProposals: ReadonlyMap<DiplomaticProposalId, DiplomaticProposal>
  treaties: ReadonlyMap<TreatyId, Treaty>
  diplomacyHistory: readonly DiplomacyEvent[]
  coalitions: ReadonlyMap<CoalitionId, CoalitionState>
  zhouInvestiture: ReadonlyMap<RealmId, ZhouInvestitureState>
  generals: ReadonlyMap<GeneralId, General>
  rulers: ReadonlyMap<RealmId, RulerState>
  academies: ReadonlyMap<AcademyId, Academy>
  eventChainStates: ReadonlyMap<EventChainId, EventChainState>
  reformStates: ReadonlyMap<RealmId, ReformState>
  disasterStates: ReadonlyMap<RealmId, DisasterState>
  tradeRoutes: ReadonlyMap<TradeRouteId, TradeRoute>
  factionInfluences: ReadonlyMap<RealmId, FactionInfluenceState>
  passes: ReadonlyMap<PassId, Pass>
  adjacencyEdges: ReadonlyMap<AdjacencyEdgeId, AdjacencyEdge>
  sieges: ReadonlyMap<SiegeId, Siege>
  edicts: ReadonlyMap<EdictId, EdictState>
  governorAssignments: ReadonlyMap<SiteId, GovernorAssignment>
  intelligenceCoverage: IntelligenceCoverage
  spyMissions: ReadonlyMap<SpyMissionId, SpyMission>
  counterIntelStates: ReadonlyMap<RealmId, CounterIntelState>
  provinces: ReadonlyMap<ProvinceId, Province>
  regions: ReadonlyMap<RegionId, Region>
  characterTemplates: ReadonlyMap<CharId, CharacterTemplate>
  localization: ReadonlyMap<string, string>
  aiState: ReadonlyMap<RealmId, AIState>
  difficulty: DifficultyTier
  diplomaticMemory: ReadonlyMap<MemoryKey, DiplomaticMemory>
  playerRealmId: RealmId
  rngState: RNGState // PRNG 状态在 World，不在 module 闭包
  phases: readonly TickPhase[] // Tick 阶段数组（M0 仅 1 个，但形状必须是数组）
  pendingOrders: readonly Order[]
}

// M0 数据文件结构（用于 factory 接收参数类型）
export interface M0Data {
  edges: Record<string, MapEdge>
  sites: RawSite[]
  realms: Realm[]
  initialOwnership: Record<string, RealmId>
}
