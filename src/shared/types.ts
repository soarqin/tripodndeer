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
}

/** 运行时形态的邑（含 ownerId + polygon + adjacency，均由 factory 派发） */
export interface Site extends RawSite {
  ownerId: RealmId | null
  polygon: Polygon
  adjacency: readonly SiteId[]
}

// ArmyId/ArmyTemplate - placed BEFORE Realm so Realm can reference them
export type ArmyId = string

export interface ArmyTemplate {
  readonly id: ArmyId
  readonly manpower: number
  readonly location: SiteId
}

export type ArmyState = 'idle' | 'marching' | 'retreating'

export interface Army {
  readonly id: ArmyId
  readonly realmId: RealmId
  readonly manpower: number
  readonly location: SiteId
  readonly state: ArmyState
  readonly destination: SiteId | null
  readonly ticksRemaining: number
  readonly source: SiteId | null
}

export type OrderType = 'march' | 'declareWarAndMarch'

export interface Order {
  readonly type: OrderType
  readonly armyId: ArmyId
  readonly targetSiteId: SiteId
}

export type WarKey = string

// Realm definition (id=opaque, color=CSS string)
export interface Realm {
  readonly id: RealmId
  readonly displayName: string
  readonly fullTitle: string
  readonly color: string // e.g. '#dc2626'
  readonly capital: SiteId
  readonly initialSites: readonly SiteId[]
  readonly initialArmies: readonly ArmyTemplate[]
  readonly aiPersonality: 'aggressive_random'
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

// 时间速度档位
export type SpeedTier = 'pause' | '1x' | '2x' | '3x' | '4x' | '5x'

// Tick 阶段函数签名
export type TickPhase = (
  world: World,
  rng: RNGState,
) => { world: World; nextRng: RNGState; events: GameEvent[] }

// 世界状态（核心数据结构）
export interface World {
  date: GameDate
  tick: number
  sites: ReadonlyMap<SiteId, Site>
  realms: ReadonlyMap<RealmId, Realm>
  edges: ReadonlyMap<EdgeId, MapEdge>
  rngState: RNGState // PRNG 状态在 World，不在 module 闭包
  phases: readonly TickPhase[] // Tick 阶段数组（M0 仅 1 个，但形状必须是数组）
}

// M0 数据文件结构（用于 factory 接收参数类型）
export interface M0Data {
  edges: Record<string, MapEdge>
  sites: RawSite[]
  realms: Realm[]
  initialOwnership: Record<string, RealmId>
}
