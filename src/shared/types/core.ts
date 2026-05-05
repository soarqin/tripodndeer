import type { TerrainType } from '~/content/m2/balance'
import type { SiteEconomy } from './economy'
import type { CulturalTag, PassId } from './world'
import type { GeneralId } from './character'

// 邑的 ID 类型（opaque string，如 'site_1'）
export type SiteId = string

// 领域 ID（opaque string，如 'realm_red', 'realm_blue'）
// CRITICAL: 绝对不用 'red' | 'blue' 字面量联合类型
export type RealmId = string

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

export type AdjacencyEdgeId = string

export interface AdjacencyEdge {
  id: AdjacencyEdgeId
  fromSiteId: SiteId
  toSiteId: SiteId
  passId: PassId
}

export interface SiteOccupation {
  occupierId: RealmId
  controlLevel: number
}
