import m0Data from '@/content/m0/sites.json'
import { INITIAL_DATE } from '@/shared/constants'
import { M0DataSchema } from '@/shared/schemas'
import type {
  BoundaryRef,
  EdgeId,
  M0Data,
  MapEdge,
  Realm,
  RealmId,
  Site,
  SiteId,
  Vec2,
  World,
} from '@/shared/types'

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

/** 加载并验证 M0 地图数据（静态 import + Zod 校验） */
export function loadM0Data(): M0Data {
  return M0DataSchema.parse(m0Data)
}

/** 构造初始 World（含 Zod 校验 + ownership 引用完整性 + polygon/adjacency 派发） */
export function createInitialWorld(data: M0Data, seed: number): World {
  // Paranoid validation
  M0DataSchema.parse(data)

  // Build realms map
  const realms = new Map<RealmId, Realm>()
  for (const realm of data.realms) {
    realms.set(realm.id, realm)
  }

  // Derive adjacency from shared edges
  const adjacencyMap = deriveAdjacency(data.sites)

  // Build sites map with polygon + adjacency + ownerId injected
  const sites = new Map<SiteId, Site>()
  for (const rawSite of data.sites) {
    const ownerId = data.initialOwnership[rawSite.id] ?? null
    if (ownerId !== null && !realms.has(ownerId)) {
      throw new Error(`${rawSite.id} references unknown realm ${ownerId}`)
    }
    const polygon = expandPolygon(rawSite.boundary, data.edges)
    const adjacency = adjacencyMap.get(rawSite.id) ?? []
    const site: Site = {
      ...rawSite,
      ownerId,
      polygon,
      adjacency,
    }
    sites.set(rawSite.id, site)
  }

  const edgesMap = new Map<EdgeId, MapEdge>()
  for (const [id, edge] of Object.entries(data.edges)) {
    edgesMap.set(id, edge)
  }

  return {
    date: { ...INITIAL_DATE },
    tick: 0,
    sites,
    realms,
    edges: edgesMap,
    rngState: { seed, counter: 0 },
    phases: [],
  }
}
