import m0Data from '@/content/m0/sites.json'
import m1Data from '@/content/m1/scenario.json'
import { INITIAL_DATE } from '@/shared/constants'
import { M0DataSchema, M1DataSchemaV6, M1DataSchemaV7 } from '@/shared/schemas'
import { aiPlanStep } from '~/engine/systems/ai'
import { characterLifecyclePhase } from '~/engine/systems/character'
import { combatV2Step } from '~/engine/systems/combat-v2'
import { culturalIdentityPhase } from '~/engine/systems/culture/cultural-identity-phase'
import { ideologyDriftPhase } from '~/engine/systems/culture/ideology-drift-phase'
import { prestigeUpdatePhase } from '~/engine/systems/culture/prestige-update-phase'
import { diplomacyLifecycleStep } from '~/engine/systems/diplomacy'
import { disasterPhase } from '~/engine/systems/disaster/disaster-phase'
import { economyPhase } from '~/engine/systems/economy'
import { factionPhase } from '~/engine/systems/faction/faction-phase'
import { historicalEventsPhase } from '~/engine/systems/events'
import { manpowerTick } from '~/engine/systems/manpower'
import { marchStep } from '~/engine/systems/march'
import { orderApplyStep } from '~/engine/systems/orders'
import { recruitmentPhase } from '~/engine/systems/recruitment'
import { reformPhase } from '~/engine/systems/reform'
import { rulerLifecyclePhase } from '~/engine/systems/ruler'
import { siegeStep } from '~/engine/systems/siege'
import { tradePhase } from '~/engine/systems/trade/trade-phase'
import { victoryCheckStep } from '~/engine/systems/victory'
import {
  M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
  M4_DEFAULT_REALM_FOOD_STORES,
  M4_DEFAULT_REALM_TREASURY,
  M4_DEFAULT_SITE_POPULATION,
  M4_DEFAULT_TAX_RATE,
  M4_HOUSEHOLD_DIVISOR,
} from '~/content/m2/balance'
import type {
  Academy,
  AcademyId,
  AdjacencyEdge,
  AdjacencyEdgeId,
  BoundaryRef,
  Army,
  ArmyId,
  CoalitionId,
  CoalitionState,
  CounterIntelState,
  CoverageKey,
  CulturalTag,
  DisasterState,
  DiplomaticProposal,
  DiplomaticProposalId,
  DiplomaticRelation,
  EdictId,
  EdictState,
  EventChainId,
  EventChainState,
  FactionId,
  FactionInfluenceState,
  ReformState,
  GovernorAssignment,
  ZhouInvestitureState,
  RelationKey,
  RulerState,
  SpyMission,
  SpyMissionId,
  TradeRoute,
  TradeRouteId,
  Treaty,
  TreatyId,
  EdgeId,
  General,
  GeneralId,
  IdeologyLean,
  M0Data,
  MapEdge,
  Pass,
  PassId,
  PeaceProposal,
  PeaceProposalId,
  Realm,
  RealmId,
  Siege,
  SiegeId,
  Site,
  SiteId,
  Vec2,
  WarKey,
  WarState,
  World,
} from '@/shared/types'
import { makeCoverageKey } from '@/shared/types'
import type { M1DataV6, M1DataV7 } from '@/shared/schemas'
import { migrateScenarioV6ToV7 } from './migrations/v6-to-v7'

/** 将一个 site 的 boundary 引用展开为具体的 polygon 顶点列表 */
function expandPolygon(
  boundary: readonly BoundaryRef[],
  edges: Record<EdgeId, MapEdge>,
): Vec2[] {
  const polygon: Vec2[] = []
  for (const ref of boundary) {
    const edge = edges[ref.edge]
    if (!edge) throw new Error(`Unknown edge: ${ref.edge}`)
    const anchors = ref.reverse ? [...edge.anchors].reverse() : [...edge.anchors]
    // 第一段全部加入；后续每段跳过首点（避免与上一段尾点重复）
    const start = polygon.length === 0 ? 0 : 1
    for (let i = start; i < anchors.length; i++) {
      polygon.push(anchors[i]!)
    }
  }
  return polygon
}

/** 由共享 edge 反推邻接：被恰好两个 site 引用的 edge → 这两个 site 互为邻居 */
function deriveAdjacency(sites: readonly M0Data['sites'][number][]): Map<SiteId, SiteId[]> {
  const edgeToSites = new Map<EdgeId, SiteId[]>()
  for (const site of sites) {
    for (const ref of site.boundary) {
      const list = edgeToSites.get(ref.edge) ?? []
      list.push(site.id)
      edgeToSites.set(ref.edge, list)
    }
  }
  const adj = new Map<SiteId, Set<SiteId>>()
  for (const [, siteIds] of edgeToSites) {
    if (siteIds.length !== 2) continue
    const [a, b] = siteIds as [SiteId, SiteId]
    if (!adj.has(a)) adj.set(a, new Set())
    if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }
  return new Map([...adj].map(([k, v]) => [k, [...v]]))
}

function buildRealmMap(realms: readonly Realm[]): Map<RealmId, Realm> {
  const realmMap = new Map<RealmId, Realm>()
  for (const realm of realms) {
    realmMap.set(realm.id, {
      ...realm,
      economy: {
        treasury: M4_DEFAULT_REALM_TREASURY,
        foodStores: M4_DEFAULT_REALM_FOOD_STORES,
        taxRate: M4_DEFAULT_TAX_RATE,
      },
      traits: realm.traits ?? [],
      politicalSystem: realm.politicalSystem ?? 'enfeoffment',
      prestige: prestigeForRealm(realm.id),
      ideologyLean: zeroIdeologyLean(),
      warVictoriesThisYear: 0,
    })
  }
  return realmMap
}

function zeroIdeologyLean(): IdeologyLean {
  return { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }
}

function prestigeForRealm(realmId: RealmId): number {
  switch (realmId) {
    case 'realm_qin':
    case 'realm_chu':
    case 'realm_qi':
      return 70
    case 'realm_yan':
    case 'realm_zhao':
    case 'realm_wei':
    case 'realm_han':
      return 55
    case 'realm_zhou':
      return 90
    default:
      return 40
  }
}

function culturalTagForOwner(ownerId: RealmId | null): CulturalTag {
  switch (ownerId) {
    case 'realm_qin':
      return 'chinese_qin'
    case 'realm_chu':
      return 'chinese_chu'
    case 'realm_qi':
      return 'chinese_qi'
    case 'realm_zhou':
      return 'chinese_zhou_central'
    case 'realm_yan':
      return 'chinese_yan'
    case 'realm_zhao':
      return 'chinese_zhao'
    case 'realm_wei':
      return 'chinese_wei'
    case 'realm_han':
      return 'chinese_han'
    default:
      return 'di_xirong'
  }
}

function buildSites(
  sitesInput: readonly M0Data['sites'][number][],
  edges: Record<EdgeId, MapEdge>,
  initialOwnership: Record<string, RealmId>,
  realms: ReadonlyMap<RealmId, Realm>,
): Map<SiteId, Site> {
  const adjacencyMap = deriveAdjacency(sitesInput)
  const sites = new Map<SiteId, Site>()

  for (const rawSite of sitesInput) {
    const ownerId = initialOwnership[rawSite.id] ?? null
    if (ownerId !== null && !realms.has(ownerId)) {
      throw new Error(`${rawSite.id} references unknown realm ${ownerId}`)
    }
    const polygon = expandPolygon(rawSite.boundary, edges)
    const adjacency = adjacencyMap.get(rawSite.id) ?? []
    const households = Math.floor(M4_DEFAULT_SITE_POPULATION / M4_HOUSEHOLD_DIVISOR)
    sites.set(rawSite.id, {
      ...rawSite,
      ownerId,
      polygon,
      adjacency,
      cultural: culturalTagForOwner(ownerId),
      culturalIdentityStrength: 100,
      lastConquestTick: null,
      lowIdentitySinceTick: null,
      economy: {
        population: M4_DEFAULT_SITE_POPULATION,
        households,
        taxBase: households,
        foodProduction: households * M4_BASE_FOOD_PRODUCTION_PER_HOUSEHOLD,
      },
      occupation: ownerId !== null ? { occupierId: ownerId, controlLevel: 100 } : undefined,
    })
  }

  return sites
}

function buildEdgesMap(edges: Record<EdgeId, MapEdge>): Map<EdgeId, MapEdge> {
  return new Map(Object.entries(edges))
}

function buildInitialIntelligenceCoverage(
  realmIds: readonly RealmId[],
): Map<CoverageKey, number> {
  const sorted = [...realmIds].sort((a, b) => a.localeCompare(b))
  const coverage = new Map<CoverageKey, number>()
  for (const observer of sorted) {
    for (const target of sorted) {
      if (observer === target) continue
      coverage.set(makeCoverageKey(observer, target), 0)
    }
  }
  return coverage
}

function buildInitialCounterIntelStates(
  realmIds: readonly RealmId[],
): Map<RealmId, CounterIntelState> {
  const states = new Map<RealmId, CounterIntelState>()
  for (const realmId of realmIds) {
    states.set(realmId, {
      realmId,
      detectionLevel: 0,
      lastUpdatedTick: 0,
    })
  }
  return states
}

/** 加载并验证 M0 地图数据（静态 import + Zod 校验） */
export function loadM0Data(): M0Data {
  return M0DataSchema.parse(m0Data)
}

/** 加载并验证 M1 场景数据（静态 import + Zod 校验） */
export function loadM1Data(): M1DataV7 {
  const raw = m1Data as unknown
  const version = (raw as { schema_version?: number } | null)?.schema_version
  if (version === undefined || version < 7) {
    return migrateScenarioV6ToV7(raw)
  }
  return M1DataSchemaV7.parse(raw)
}

/** 构造初始 World（含 Zod 校验 + ownership 引用完整性 + polygon/adjacency 派发） */
export function createInitialWorld(data: M0Data, seed: number): World {
  // Paranoid validation
  M0DataSchema.parse(data)

  const realms = buildRealmMap(data.realms)
  const sites = buildSites(data.sites, data.edges, data.initialOwnership, realms)
  const edgesMap = buildEdgesMap(data.edges)

  return {
    date: { ...INITIAL_DATE },
    tick: 0,
    sites,
    realms,
    edges: edgesMap,
    armies: new Map(),
    wars: new Map<WarKey, WarState>(),
    peaceProposals: new Map<PeaceProposalId, PeaceProposal>(),
    relations: new Map<RelationKey, DiplomaticRelation>(),
    diplomaticProposals: new Map<DiplomaticProposalId, DiplomaticProposal>(),
    treaties: new Map<TreatyId, Treaty>(),
    diplomacyHistory: [],
    coalitions: new Map<CoalitionId, CoalitionState>(),
    zhouInvestiture: new Map(),
    generals: new Map<GeneralId, General>(),
    rulers: new Map(),
    academies: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    disasterStates: new Map(),
    tradeRoutes: new Map(),
    factionInfluences: new Map(),
    passes: new Map<PassId, Pass>(),
    adjacencyEdges: new Map<AdjacencyEdgeId, AdjacencyEdge>(),
    sieges: new Map<SiegeId, Siege>(),
    edicts: new Map<EdictId, EdictState>(),
    governorAssignments: new Map<SiteId, GovernorAssignment>(),
    intelligenceCoverage: buildInitialIntelligenceCoverage(data.realms.map(r => r.id)),
    spyMissions: new Map<SpyMissionId, SpyMission>(),
    counterIntelStates: buildInitialCounterIntelStates(data.realms.map(r => r.id)),
    playerRealmId: data.realms[0]?.id ?? '',
    rngState: { seed, counter: 0 },
    phases: [],
    pendingOrders: [],
  }
}

export function createWorldFromM1Data(
  data: M1DataV6 | M1DataV7,
  seed: number,
  playerRealmId: RealmId,
): World {
  if (data.schema_version === 7) {
    M1DataSchemaV7.parse(data)
  } else {
    M1DataSchemaV6.parse(data)
  }

  const realms = buildRealmMap(data.realms)
  const sites = buildSites(data.sites, data.edges, data.initialOwnership, realms)
  const edges = buildEdgesMap(data.edges)

  const armies = new Map<ArmyId, Army>()
  for (const realm of data.realms) {
    for (const template of realm.initialArmies) {
      armies.set(template.id, {
        id: template.id,
        realmId: realm.id,
        manpower: template.manpower,
        location: template.location,
        state: 'idle',
        destination: null,
        ticksRemaining: 0,
        source: null,
      })
    }
  }

  const wars = new Map<WarKey, WarState>()
  for (const war of data.initialWars) {
    const key = [war.a, war.b].sort().join(':')
    wars.set(key, {
      casusBelli: null,
      declaredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      occupiedSites: new Map(),
      peaceProposalId: null,
    })
  }

  const generals = new Map<GeneralId, General>()
  for (const gen of data.generals as General[]) {
    generals.set(gen.id, gen)
  }

  const adjacencyEdges = new Map<AdjacencyEdgeId, AdjacencyEdge>()
  for (const ae of data.adjacencyEdges as AdjacencyEdge[]) {
    adjacencyEdges.set(ae.id, ae)
  }

  const passes = new Map<PassId, Pass>()
  for (const pass of data.passes as Pass[]) {
    passes.set(pass.id, pass)
  }

  const relations = new Map<RelationKey, DiplomaticRelation>()
  for (const relation of data.relations) {
    relations.set(relation.key, relation)
  }

  const diplomaticProposals = new Map<DiplomaticProposalId, DiplomaticProposal>()
  for (const proposal of data.diplomaticProposals) {
    diplomaticProposals.set(proposal.id, proposal)
  }

  const treaties = new Map<TreatyId, Treaty>()
  for (const treaty of data.treaties) {
    treaties.set(treaty.id, treaty)
  }

  const coalitions = new Map<CoalitionId, CoalitionState>()
  for (const coalition of data.coalitions) {
    coalitions.set(coalition.id, coalition)
  }

  const zhouInvestiture = new Map<RealmId, ZhouInvestitureState>()
  for (const investiture of data.zhouInvestiture) {
    zhouInvestiture.set(investiture.realmId, investiture)
  }

  const rulers = new Map<RealmId, RulerState>()
  for (const ruler of data.rulers) {
    rulers.set(ruler.realmId, ruler)
  }

  const eventChainStates = new Map<EventChainId, EventChainState>()
  for (const chain of data.eventChainStates) {
    eventChainStates.set(chain.id, chain)
  }

  const reformStates = new Map<RealmId, ReformState>()
  for (const reformState of data.reformStates) {
    reformStates.set(reformState.realmId, reformState)
  }

  const disasterStates = new Map<RealmId, DisasterState>()
  for (const disaster of data.disasterStates ?? []) {
    disasterStates.set(disaster.realmId, disaster)
  }

  const tradeRoutes = new Map<TradeRouteId, TradeRoute>()
  for (const route of data.tradeRoutes ?? []) {
    tradeRoutes.set(route.id, route)
  }

  const factionInfluences = new Map<RealmId, FactionInfluenceState>()
  for (const fi of data.factionInfluences ?? []) {
    factionInfluences.set(fi.realmId, {
      realmId: fi.realmId,
      influences: new Map(Object.entries(fi.influences)) as ReadonlyMap<FactionId, number>,
    })
  }

  const academies = new Map<AcademyId, Academy>()
  for (const academy of (data.academies ?? []) as Academy[]) {
    academies.set(academy.id, academy)
  }

  return {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites,
    realms,
    armies,
    edges,
    wars,
    peaceProposals: new Map<PeaceProposalId, PeaceProposal>(),
    relations,
    diplomaticProposals,
    treaties,
    diplomacyHistory: data.diplomacyHistory,
    coalitions,
    zhouInvestiture,
    generals,
    rulers,
    academies,
    eventChainStates,
    reformStates,
    disasterStates,
    tradeRoutes,
    factionInfluences,
    passes,
    adjacencyEdges,
    sieges: new Map<SiegeId, Siege>(),
    edicts: new Map<EdictId, EdictState>(),
    governorAssignments: new Map<SiteId, GovernorAssignment>(),
    intelligenceCoverage: buildInitialIntelligenceCoverage(data.realms.map(r => r.id)),
    spyMissions: new Map<SpyMissionId, SpyMission>(),
    counterIntelStates: buildInitialCounterIntelStates(data.realms.map(r => r.id)),
    playerRealmId,
    rngState: { seed, counter: 0 },
    phases: [
      aiPlanStep,
      orderApplyStep,
      marchStep,
      siegeStep,
      combatV2Step,
      culturalIdentityPhase,
      manpowerTick,
      rulerLifecyclePhase,
      characterLifecyclePhase,
      recruitmentPhase,
      ideologyDriftPhase,
      reformPhase,
      victoryCheckStep,
      diplomacyLifecycleStep,
      economyPhase,
      disasterPhase,
      tradePhase,
      factionPhase,
      historicalEventsPhase,
      prestigeUpdatePhase,
    ],
    pendingOrders: [],
  }
}
