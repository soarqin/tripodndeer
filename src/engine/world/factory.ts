import m0Data from '@/content/m0/sites.json'
import m1Data from '@/content/m1/scenario.json'
import { INITIAL_DATE } from '@/shared/constants'
import { M0DataSchema, M1DataSchema } from '@/shared/schemas'
import { aiPlanStep } from '~/engine/systems/ai'
import { combatStep } from '~/engine/systems/combat'
import { marchStep } from '~/engine/systems/march'
import { orderApplyStep } from '~/engine/systems/orders'
import { victoryCheckStep } from '~/engine/systems/victory'
import type {
  BoundaryRef,
  Army,
  ArmyId,
  EdgeId,
  M0Data,
  MapEdge,
  Realm,
  RealmId,
  Site,
  SiteId,
  Vec2,
  WarKey,
  World,
} from '@/shared/types'
import type { M1Data } from '@/shared/schemas'

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
  for (const realm of realms) realmMap.set(realm.id, realm)
  return realmMap
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
    sites.set(rawSite.id, {
      ...rawSite,
      ownerId,
      polygon,
      adjacency,
    })
  }

  return sites
}

function buildEdgesMap(edges: Record<EdgeId, MapEdge>): Map<EdgeId, MapEdge> {
  return new Map(Object.entries(edges))
}

/** 加载并验证 M0 地图数据（静态 import + Zod 校验） */
export function loadM0Data(): M0Data {
  return M0DataSchema.parse(m0Data)
}

/** 加载并验证 M1 场景数据（静态 import + Zod 校验） */
export function loadM1Data(): M1Data {
  return M1DataSchema.parse(m1Data)
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
    wars: new Map(),
    playerRealmId: data.realms[0]?.id ?? '',
    rngState: { seed, counter: 0 },
    phases: [],
    pendingOrders: [],
  }
}

export function createWorldFromM1Data(
  data: M1Data,
  seed: number,
  playerRealmId: RealmId,
): World {
  M1DataSchema.parse(data)

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

  const wars = new Map<WarKey, true>()
  for (const war of data.initialWars) {
    const key = [war.a, war.b].sort().join(':')
    wars.set(key, true)
  }

  return {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites,
    realms,
    armies,
    edges,
    wars,
    playerRealmId,
    rngState: { seed, counter: 0 },
    phases: [aiPlanStep, orderApplyStep, marchStep, combatStep, victoryCheckStep],
    pendingOrders: [],
  }
}
