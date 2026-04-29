import type { GameDate, SpeedTier } from './types'

// Tick 间隔（来自 01-core-loop.md §2.2）
export const TICK_INTERVAL_MS: Record<SpeedTier, number> = {
  pause: Infinity,
  '1x': 5000,
  '2x': 2500,
  '3x': 1500,
  '4x': 800,
  '5x': 400,
}

// 防止 tab-background 后 RAF 累积时间的最大 deltaMs cap
// 注意：cap 在 driver 层（raf-driver.ts），engine 本身信任输入
export const MAX_DELTA_MS = 100

// 每 N 个 tick 触发一次涂色（可被 URL ?paintInterval=N 覆盖）
export const PAINT_INTERVAL_TICKS = 3

// 游戏起始日期：公元前 453 年春上旬（三家分晋）
export const INITIAL_DATE: GameDate = {
  yearBC: 453,
  season: 'spring',
  month: 1,
  xun: 'shang',
}
