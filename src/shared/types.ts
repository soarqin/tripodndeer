import type { TerrainType } from '~/content/m2/balance'

// 邑的 ID 类型（opaque string，如 'site_1'）
export type SiteId = string

// 领域 ID（opaque string，如 'realm_red', 'realm_blue'）
// CRITICAL: 绝对不用 'red' | 'blue' 字面量联合类型
export type RealmId = string

export type EdictId = string

// 2D 坐标（只读 tuple）
export type Vec2 = readonly [number, number]

// 多边形顶点列表
export type Polygon = readonly Vec2[]

// ─── 边索引地图格式（M0.2+） ────────────────────────────────────────────────

export type EdgeId = string
export type CurveType = 'polyline' | 'cubic-bezier' | 'catmull-rom'

/** 单条边（曲线段）— 全局唯一，多 site 共享引用 */
export interface MapEdge {
  id: EdgeId
  curveType: CurveType
  readonly travel_cost: number
  anchors: readonly Vec2[]
  /** cubic-bezier 时必填：length === anchors.length - 1；每对 [C1, C2] 为控制点 */
  controls?: readonly (readonly [Vec2, Vec2])[]
}

/** Site 的 boundary 边引用 */
export interface BoundaryRef {
  edge: EdgeId
  reverse: boolean
}

/** Content/JSON 形态的邑（通过 boundary 引用 edges） */
export interface RawSite {
  id: SiteId
  name: string
  position: Vec2
  boundary: readonly BoundaryRef[]
  terrainType?: TerrainType
}

/** 运行时形态的邑（含 ownerId + polygon + adjacency，均由 factory 派发） */
export interface Site extends RawSite {
  ownerId: RealmId | null
  polygon: Polygon
  adjacency: readonly SiteId[]
  economy: SiteEconomy
  readonly cultural?: CulturalTag
  readonly culturalIdentityStrength?: number
  readonly lastConquestTick?: number | null
  readonly lowIdentitySinceTick?: number | null
  occupation?: SiteOccupation
}

// ArmyId/ArmyTemplate - placed BEFORE Realm so Realm can reference them
export type ArmyId = string

export interface ArmyTemplate {
  readonly id: ArmyId
  readonly manpower: number
  readonly location: SiteId
}

export type ArmyState = 'idle' | 'marching' | 'retreating' | 'besieging' | 'engaged' | 'blocked'

export interface Army {
  readonly id: ArmyId
  readonly realmId: RealmId
  readonly manpower: number
  readonly location: SiteId
  readonly state: ArmyState
  readonly destination: SiteId | null
  readonly ticksRemaining: number
  readonly source: SiteId | null
  readonly generalId?: GeneralId
  readonly composition?: {
    infantry: number
    chariot: number
    cavalry: number
    crossbow: number
  }
}

export type EdictKind = 'edict_tax_relief' | 'edict_grain_reserve'
export type EdictStatus = 'active' | 'expired'
export type GovernorModifierKind = 'tax_efficiency' | 'food_efficiency'

export interface RealmEconomy {
  readonly treasury: number
  readonly foodStores: number
  readonly taxRate: number
}

export interface SiteEconomy {
  readonly population: number
  readonly households: number
  readonly taxBase: number
  readonly foodProduction: number
}

export interface EdictState {
  readonly id: EdictId
  readonly realmId: RealmId
  readonly kind: EdictKind
  readonly startedAtTick: number
  readonly durationMonths: number
  readonly remainingMonths: number
  readonly status: EdictStatus
}

export interface GovernorAssignment {
  readonly siteId: SiteId
  readonly realmId: RealmId
  readonly generalId: GeneralId
  readonly assignedAtTick: number
  readonly modifierKind: GovernorModifierKind
}

export type OrderType =
  | 'march'
  | 'declareWarAndMarch'
  | 'declare-war'
  | 'propose-peace'
  | 'activate-edict'
  | 'assign-governor'
  | 'assign-post'
  | 'unassign-post'

export interface ActivateEdictOrder {
  readonly type: 'activate-edict'
  readonly edictId: EdictId
  readonly realmId: RealmId
  readonly kind: EdictKind
  readonly durationMonths: number
}

export interface AssignGovernorOrder {
  readonly type: 'assign-governor'
  readonly siteId: SiteId
  readonly generalId: GeneralId
}

export interface AssignPostOrder {
  readonly type: 'assign-post'
  readonly generalId: GeneralId
  readonly post: Post
}

export interface UnassignPostOrder {
  readonly type: 'unassign-post'
  readonly generalId: GeneralId
  readonly post: Post
}

export interface PeaceProposalOrderData {
  readonly proposalId: string
  readonly proposingRealmId: RealmId
  readonly targetRealmId: RealmId
  readonly terms: readonly PeaceTerm[]
}

export interface Order {
  readonly type: OrderType
  readonly armyId?: ArmyId
  readonly targetSiteId?: SiteId
  readonly siteId?: SiteId
  readonly targetRealmId?: RealmId
  readonly realmId?: RealmId
  readonly casusBelli?: CasusBelliId
  readonly peaceProposalData?: PeaceProposalOrderData
  readonly edictId?: EdictId
  readonly kind?: EdictKind
  readonly durationMonths?: number
  readonly generalId?: GeneralId
  readonly post?: Post
}

export type WarKey = string

export type CasusBelliId = string
export type PeaceProposalId = string
export type AdjacencyEdgeId = string
export type PassId = string
export type GeneralId = string
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

export type RulerStateId = string
// Canonical sorted pair `${lowerRealmId}__${higherRealmId}`.
export type RelationKey = string
export type DiplomaticProposalId = string
export type TreatyId = string
export type DiplomacyEventId = string
export type CoalitionId = string

export type DiplomaticActionKind = 'alliance' | 'non_aggression' | 'tribute' | 'marriage' | 'envoy' | 'declare_war' | 'peace'
export type DiplomaticProposalStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
export type DiplomaticTreatyKind = 'alliance' | 'non_aggression' | 'tribute' | 'marriage' | 'truce'
export type DiplomaticTreatyStatus = 'active' | 'expired' | 'cancelled' | 'broken'
export type DiplomacyEventKind = 'proposal_created' | 'proposal_resolved' | 'treaty_created' | 'treaty_ended' | 'war_declared' | 'betrayal' | 'relation_changed' | 'coalition_changed' | 'zhou_investiture_changed'
export type DiplomacyEventReason = 'war_declaration_against_treaty'
export type CoalitionStatus = 'forming' | 'active' | 'dissolved'

export interface DiplomaticRelation {
  readonly key: RelationKey
  readonly realmAId: RealmId
  readonly realmBId: RealmId
  readonly attitude: number
  readonly trust: number
  readonly updatedAt: GameDate
}

export interface DiplomaticProposal {
  readonly id: DiplomaticProposalId
  readonly kind: DiplomaticActionKind
  readonly proposingRealmId: RealmId
  readonly targetRealmId: RealmId
  readonly status: DiplomaticProposalStatus
  readonly proposedAt: GameDate
  readonly proposedAtTick: number
  readonly expiresAt: GameDate
  readonly expiresAtTick: number
  readonly resolvedAt: GameDate | null
  readonly resolvedAtTick: number | null
  readonly treatyId: TreatyId | null
}

export interface Treaty {
  readonly id: TreatyId
  readonly kind: DiplomaticTreatyKind
  readonly realmAId: RealmId
  readonly realmBId: RealmId
  readonly status: DiplomaticTreatyStatus
  readonly signedAt: GameDate
  readonly signedAtTick: number
  readonly expiresAt: GameDate | null
  readonly expiresAtTick: number | null
  readonly endedAt: GameDate | null
  readonly endedAtTick: number | null
  readonly sourceProposalId: DiplomaticProposalId | null
}

export interface DiplomacyEvent {
  readonly id: DiplomacyEventId
  readonly kind: DiplomacyEventKind
  readonly occurredAt: GameDate
  readonly actorRealmId: RealmId | null
  readonly targetRealmId: RealmId | null
  readonly proposalId?: DiplomaticProposalId
  readonly treatyId?: TreatyId
  readonly relationKey?: RelationKey
  readonly coalitionId?: CoalitionId
  readonly reason?: DiplomacyEventReason
}

export interface CoalitionState {
  readonly id: CoalitionId
  readonly targetRealmId: RealmId
  readonly memberRealmIds: readonly RealmId[]
  readonly status: CoalitionStatus
  readonly formedAt: GameDate
  readonly dissolvedAt: GameDate | null
}

export interface ZhouInvestitureState {
  readonly realmId: RealmId
  readonly recognizedTitle: string
  readonly grantedAtTick: number
  readonly expiresAtTick: number | null
  readonly source: 'zhou'
  readonly rank?: 'duke' | 'marquis' | 'count' | 'viscount' | 'baron'
  readonly lastTributeTick?: number
}

export type AIPersonality = 'aggressive_random' | 'aggressive' | 'cautious'

export type PersonalityArchetype =
  | 'conqueror'
  | 'steward'
  | 'schemer'
  | 'learned'
  | 'tyrant'
  | 'incompetent'
  | 'benevolent'
  | 'builder'

export type Specialty =
  | 'commander'
  | 'warrior'
  | 'strategist'
  | 'administrator'
  | 'reformer'
  | 'diplomat'
  | 'spy'
  | 'scholar'
  | 'engineer'

export type Ambition = 'low' | 'mid' | 'high'

export type LoyaltyState =
  | 'loyal'
  | 'shirking'
  | 'seeking_departure'
  | 'secret_contact'
  | 'defected'

export type FactionId =
  | 'royal_kin'
  | 'noble_clans'
  | 'military_meritocracy'
  | 'reformists'
  | 'conservatives'
  | 'foreign_clients'

export type DisasterId = string
export type TradeRouteId = string
export type FactionImbalanceEventId = string

export type Post = 'ruler' | 'chancellor' | 'general' | 'governor'

export const ESPIONAGE_ACTION_KINDS = ['reconnaissance', 'rumor', 'discord', 'counter_intel'] as const
export type EspionageActionKind = typeof ESPIONAGE_ACTION_KINDS[number]
export const ESPIONAGE_RISK_TIERS: Record<EspionageActionKind, 'low' | 'mid' | 'high' | 'defensive'> = {
  reconnaissance: 'low',
  rumor: 'mid',
  discord: 'high',
  counter_intel: 'defensive',
} as const
export type EspionageRiskTier = 'low' | 'mid' | 'high' | 'defensive'

// ─── M7 Espionage: SpyMission & IntelligenceCoverage ────────────────────────

export type SpyMissionId = string
export type CoverageKey = string  // format: `${observerRealmId}__${targetRealmId}` (directional, NOT lex-sorted)
export type SpyMissionStatus = 'in_progress' | 'success' | 'failed' | 'exposed' | 'cancelled'

export interface SpyMission {
  readonly id: SpyMissionId
  readonly spyGeneralId: GeneralId
  readonly spyRealmId: RealmId           // observer realm
  readonly targetRealmId: RealmId
  readonly action: EspionageActionKind
  readonly startTick: number
  readonly resolveTick: number           // startTick + duration
  readonly status: SpyMissionStatus
  readonly targetGeneralId: GeneralId | null  // only used for discord action
}

export type IntelligenceCoverage = ReadonlyMap<CoverageKey, number>  // 0-100 directional

export function makeCoverageKey(observerId: RealmId, targetId: RealmId): CoverageKey {
  return `${observerId}__${targetId}`
}

// ─── M7 Espionage: CounterIntelState & AIEspionageOption ────────────────────

export interface CounterIntelState {
  readonly realmId: RealmId
  readonly detectionLevel: number  // 0-10 integer
  readonly lastUpdatedTick: number
}

// AIEspionageOption is a PARALLEL type to AIOption — does NOT extend it
// This is Path B decision: keeps AIOption.kind union clean
export interface AIEspionageOption {
  readonly kind: EspionageActionKind
  readonly spyRealmId: RealmId
  readonly targetRealmId: RealmId
  readonly score?: number
}

export interface WarState {
  casusBelli: CasusBelliId | null
  declaredAt: GameDate
  occupiedSites: ReadonlyMap<SiteId, RealmId>
  peaceProposalId: PeaceProposalId | null
}

export interface RealmStats {
  manpowerPool: number
  manpowerCap: number
  warWeariness: number
}

export interface AdjacencyEdge {
  id: AdjacencyEdgeId
  fromSiteId: SiteId
  toSiteId: SiteId
  passId: PassId
}

export interface General {
  id: GeneralId
  realmId: RealmId
  name: string
  might: number
  command: number
  loyalty: number
  strategy?: number
  learning?: number
  attrs?: {
    wu: number
    zheng: number
    jiao: number
    mou: number
    xue: number
    po: number
  }
  specialty?: Specialty
  ambition?: Ambition
  faction?: FactionId
  age?: number
  recruitedAtTick?: number
  posts?: readonly Post[]
  loyaltyState?: LoyaltyState
  readonly almaMater?: AcademyId
}

export interface RulerState {
  readonly realmId: RealmId
  readonly generalId: GeneralId
  readonly age: number
  readonly lifespan: number
  readonly health: number
  readonly personality: PersonalityArchetype
  readonly successionLawId: 'primogeniture'
  readonly inOfficeSinceTick: number
}

export type EventChainId = string

export type PoliticalSystem = 'enfeoffment' | 'commandery' | 'legalist_centralized'

export type ZhouInvestitureRank = 'duke' | 'marquis' | 'count' | 'viscount' | 'baron'

export type Effect =
  | { readonly type: 'realm.treasury'; readonly realmId: RealmId; readonly delta: number }
  | { readonly type: 'character.create'; readonly generalId: GeneralId; readonly realmId: RealmId; readonly name: string }
  | { readonly type: 'character.kill'; readonly generalId: GeneralId }
  | { readonly type: 'character.loyalty'; readonly generalId: GeneralId; readonly delta: number }
  | { readonly type: 'realm.trait.add'; readonly realmId: RealmId; readonly trait: string }
  | { readonly type: 'realm.politicalSystem.set'; readonly realmId: RealmId; readonly system: PoliticalSystem }
  | { readonly type: 'site.population.delta'; readonly siteId: SiteId; readonly delta: number }
  | { readonly type: 'realm.faction.delta'; readonly realmId: RealmId; readonly faction: FactionId; readonly delta: number }
  | { readonly type: 'realm.warWeariness.delta'; readonly realmId: RealmId; readonly delta: number }
  | { readonly type: 'realm.foodStores.delta'; readonly realmId: RealmId; readonly delta: number }
  | { readonly type: 'realm.prestige.delta'; readonly realmId: RealmId; readonly delta: number }
  | { readonly type: 'realm.ideology.delta'; readonly realmId: RealmId; readonly ideology: Ideology; readonly delta: number }
  | { readonly type: 'realm.relation.delta'; readonly realmId: RealmId; readonly targetRealmId: RealmId; readonly delta: number }
  | { readonly type: 'site.culturalIdentity.delta'; readonly siteId: SiteId; readonly delta: number }
  | { readonly type: 'site.cultural.set'; readonly siteId: SiteId; readonly tag: CulturalTag }
  | { readonly type: 'academy.create'; readonly academyId: AcademyId; readonly hostRealmId: RealmId; readonly hostSiteId: SiteId; readonly primaryIdeology: Ideology }
  | { readonly type: 'academy.dormant'; readonly academyId: AcademyId }
  | { readonly type: 'zhouInvestiture.grant'; readonly realmId: RealmId; readonly rank: ZhouInvestitureRank }

export interface EventChainChoice {
  readonly id: string
  readonly label: string
  readonly effects: readonly Effect[]
  readonly nextStageId?: string
}

export interface EventChainStage {
  readonly id: string
  readonly text: string
  readonly choices: readonly EventChainChoice[]
}

export type EventChainTrigger =
  | {
      readonly type: 'date'
      readonly between?: readonly [{ readonly yearBC: number }, { readonly yearBC: number }]
      readonly realmId?: RealmId
    }
  | {
      readonly type: 'state'
      readonly predicate?: PredicateNode
      readonly realmId?: RealmId
    }

export type EventChainScope = 'realm-scoped' | 'fixed-realm' | 'global'

export interface EventChain {
  readonly id: EventChainId
  readonly trigger: EventChainTrigger
  readonly oneShot: boolean
  readonly stages: readonly EventChainStage[]
  readonly scope?: EventChainScope
}

export interface EventChainState {
  readonly id: EventChainId
  readonly currentStageId: string
  readonly completed: boolean
  readonly startedAtTick: number
  readonly choiceHistory: ReadonlyArray<{ readonly stageId: string; readonly choiceId: string }>
  readonly realmId?: RealmId
}

export type AttitudeBucket = 'hostile' | 'cold' | 'neutral' | 'friendly' | 'ally'

export type PredicateNode =
  | { kind: 'realm.id'; value: RealmId }
  | { kind: 'realm.has-character-with-specialty'; specialty: Specialty }
  | { kind: 'realm.ruler-personality-in'; values: readonly PersonalityArchetype[] }
  | { kind: 'realm.has-trait'; trait: string; not?: boolean }
  | { kind: 'realm.no-active-war' }
  | { kind: 'realm.treasury-above'; value: number }
  | { kind: 'realm.population-above'; value: number }
  | { kind: 'realm.ruler-in-office-years'; minYears: number }
  | { kind: 'realm.has-political-system'; system: PoliticalSystem }
  | { kind: 'realm.year-after'; yearBC: number }
  | { kind: 'and'; children: readonly PredicateNode[] }
  | { kind: 'or'; children: readonly PredicateNode[] }
  | { kind: 'site.terrain'; siteId: SiteId; value: TerrainType }
  | { kind: 'site.population-above'; siteId: SiteId; value: number }
  | { kind: 'site.governor-zheng-above'; siteId: SiteId; value: number }
  | { kind: 'realm.faction-influence-above'; realmId: RealmId; faction: FactionId; value: number }
  | { kind: 'realm.prestige.gte'; threshold: number }
  | { kind: 'realm.prestige.lt'; threshold: number }
  | { kind: 'realm.relation.attitude'; targetRealmId: RealmId; minAttitude: AttitudeBucket }
  | { kind: 'realm.zhouInvestiture.has'; rank?: ZhouInvestitureRank }
  | { kind: 'realm.zhouInvestiture.absent' }
  | { kind: 'realm.id.equals'; value: RealmId }

export type ReformId = string

export interface ReformChoice {
  readonly id: string
  readonly labelZh: string
  readonly effects: readonly Effect[]
  readonly nextStageId?: string
  readonly outcome: 'continue' | 'success' | 'failure'
}

export interface ReformStage {
  readonly id: string
  readonly textZh: string
  readonly choices: readonly ReformChoice[]
  readonly advanceAfterMonths: number
}

export interface ReformDefinition {
  readonly id: ReformId
  readonly displayName: string
  readonly displayNameZh: string
  readonly trigger: PredicateNode
  readonly oneShot: true
  readonly stages: readonly ReformStage[]
  readonly successTrait: string
  readonly failureTrait: string
  readonly historicalYearRange?: readonly [number, number]
}

export interface ReformState {
  readonly realmId: RealmId
  readonly reformId: ReformId
  readonly currentStageId: string
  readonly startedAtTick: number
  readonly stageEnteredAtTick: number
  readonly status: 'in_progress' | 'completed_success' | 'completed_failure' | 'paused'
  readonly choiceHistory: readonly { stageId: string; choiceId: string; tick: number }[]
}

export interface DisasterChoice {
  readonly id: string
  readonly labelZh: string
  readonly costType: 'treasury' | 'foodStores' | 'morale' | 'none'
  readonly costAmount: number
  readonly effects: readonly Effect[]
  readonly outcomeZh: string
}

export interface DisasterDefinition {
  readonly id: DisasterId
  readonly displayName: string
  readonly displayNameZh: string
  readonly trigger: PredicateNode
  readonly baseProbabilityBp: number
  readonly effects: readonly Effect[]
  readonly playerChoices: readonly DisasterChoice[]
  readonly durationMonths: number
  readonly historicalYearRange?: readonly [number, number]
}

export interface DisasterState {
  readonly realmId: RealmId
  readonly disasterId: DisasterId
  readonly siteId: SiteId
  readonly startedAtTick: number
  readonly status: 'awaiting_decision' | 'resolving' | 'resolved'
  readonly chosenChoiceId?: string
  readonly resolvedAtTick?: number
}

export interface TradeRoute {
  readonly id: TradeRouteId
  readonly fromSiteId: SiteId
  readonly toSiteId: SiteId
  readonly fromRealmId: RealmId
  readonly toRealmId: RealmId
  readonly establishedAtTick: number
  readonly baseIncomePerXun: number
  readonly status: 'active' | 'cut'
}

export interface FactionInfluenceState {
  readonly realmId: RealmId
  readonly influences: ReadonlyMap<FactionId, number>
}

export interface FactionImbalanceEvent {
  readonly id: FactionImbalanceEventId
  readonly kind: 'coup' | 'split' | 'overthrow'
  readonly triggerPredicate: PredicateNode
  readonly effects: readonly Effect[]
  readonly cooldownYears: number
  readonly displayNameZh: string
}

export interface TraitEffect {
  readonly manpowerCapMultiplierBp?: number
  readonly taxIncomeMultiplierBp?: number
  readonly foodProductionMultiplierBp?: number
  readonly recruitmentSpeedMultiplierBp?: number
  readonly generalRecruitmentWeightBp?: number
  readonly combatPowerMultiplierBp?: number
  readonly disasterResistanceMultiplierBp?: number
  readonly tradeIncomeMultiplierBp?: number
  readonly factionStabilityBonusBp?: number
  readonly ideologyDeltaBp?: Partial<Record<Ideology, number>>
}

export interface TraitModifiers {
  readonly manpowerCapMultiplierBp: number
  readonly taxIncomeMultiplierBp: number
  readonly foodProductionMultiplierBp: number
  readonly recruitmentSpeedMultiplierBp: number
  readonly generalRecruitmentWeightBp: number
  readonly combatPowerMultiplierBp: number
  readonly disasterResistanceMultiplierBp: number
  readonly tradeIncomeMultiplierBp: number
  readonly factionStabilityBonusBp: number
  readonly ideologyDeltaBp?: Partial<Record<Ideology, number>>
}

export interface SiteOccupation {
  occupierId: RealmId
  controlLevel: number
}

export type SiegeId = string

export interface Siege {
  readonly id: SiegeId
  readonly attackerArmyIds: readonly ArmyId[]
  readonly defenderSiteId: SiteId
  readonly startedAt: GameDate
  readonly durationTicks: number
  readonly fortification: number
  readonly supplyRemaining: number
}

export interface CessionPayload { siteIds: SiteId[] }
export interface IndemnityPayload { amount: number }
export interface TributePayload { amountPerYear: number; years: number }

export type PeaceTerm =
  | { type: 'cession'; payload: CessionPayload }
  | { type: 'indemnity'; payload: IndemnityPayload }
  | { type: 'tribute'; payload: TributePayload }

export interface PeaceProposal {
  id: PeaceProposalId
  proposingRealmId: RealmId
  targetRealmId: RealmId
  terms: ReadonlyArray<PeaceTerm>
  proposedAt: GameDate
  status: 'pending' | 'accepted' | 'rejected'
  acknowledgedAt: GameDate | null
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
  readonly aiPersonality: AIPersonality
  readonly economy: RealmEconomy
  readonly stats?: RealmStats
  readonly rulerId?: GeneralId | null
  readonly traits: readonly string[]
  readonly politicalSystem: PoliticalSystem
  readonly prestige?: number
  readonly ideologyLean?: IdeologyLean
  readonly warVictoriesThisYear?: number
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

// 游戏事件（M0 中 events 数组永远空，但 hook 必须在）
export interface GameEvent {
  type: string
  payload: unknown
}

export interface EconomySettlementEvent {
  readonly type: 'economySettlement'
  readonly payload: {
    readonly realmId: RealmId
    readonly treasuryDelta: number
    readonly foodStoresDelta: number
    readonly populationDelta: number
    readonly householdsDelta: number
    readonly settledAtTick: number
  }
}

export type RulerDeathCause = 'natural'

export interface RulerDiedEvent {
  readonly type: 'rulerDied'
  readonly payload: {
    readonly realmId: RealmId
    readonly generalId: GeneralId
    readonly cause: RulerDeathCause
  }
}

export interface SuccessionResolvedEvent {
  readonly type: 'successionResolved'
  readonly payload: {
    readonly realmId: RealmId
    readonly newGeneralId: GeneralId
  }
}

export interface SuccessionCrisisEvent {
  readonly type: 'successionCrisis'
  readonly payload: {
    readonly realmId: RealmId
  }
}

export type CharacterDeathCause = 'natural'

export interface CharacterDiedEvent {
  readonly type: 'characterDied'
  readonly payload: {
    readonly generalId: GeneralId
    readonly generalName: string
    readonly realmId: RealmId
    readonly cause: CharacterDeathCause
  }
}

export interface CharacterDefectedEvent {
  readonly type: 'characterDefected'
  readonly payload: {
    readonly generalId: GeneralId
    readonly generalName: string
    readonly realmId: RealmId
  }
}

export interface CharacterRecruitedEvent {
  readonly type: 'characterRecruited'
  readonly payload: {
    readonly generalId: GeneralId
    readonly realmId: RealmId
    readonly name: string
  }
}

export interface RealmSplitEvent {
  readonly type: 'realmSplit'
  readonly payload: {
    readonly oldRealmId: RealmId
    readonly newRealmIds: readonly RealmId[]
  }
}

export interface GovernorAssignmentRevokedEvent {
  readonly type: 'governorAssignmentRevoked'
  readonly payload: {
    readonly siteId: SiteId
    readonly generalId: GeneralId
  }
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
