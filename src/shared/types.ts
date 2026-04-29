// 邑的 ID 类型（opaque string，如 'site_1'）
export type SiteId = string

// 势力 ID（opaque string，如 'faction_red', 'faction_blue'）
// CRITICAL: 绝对不用 'red' | 'blue' 字面量联合类型
export type FactionId = string

// 2D 坐标（只读 tuple）
export type Vec2 = readonly [number, number]

// 多边形顶点列表
export type Polygon = readonly Vec2[]

// Content/JSON 形态的邑（无 ownerId）
export interface RawSite {
  id: SiteId
  name: string
  position: Vec2
  polygon: Polygon
  adjacency: readonly SiteId[]
}

// 运行时形态的邑（含 ownerId，由工厂派发 initialOwnership 填入）
export interface Site extends RawSite {
  ownerId: FactionId | null
}

// 势力定义（id=opaque, color=CSS string）
export interface Faction {
  id: FactionId
  displayName: string
  color: string // e.g. '#dc2626'
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
  factions: ReadonlyMap<FactionId, Faction>
  rngState: RNGState // PRNG 状态在 World，不在 module 闭包
  phases: readonly TickPhase[] // Tick 阶段数组（M0 仅 1 个，但形状必须是数组）
}

// M0 数据文件结构（用于 factory 接收参数类型）
export interface M0Data {
  sites: RawSite[]
  factions: Faction[]
  initialOwnership: Record<string, FactionId>
}
