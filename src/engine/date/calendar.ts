import type { GameDate } from '@/shared/types'

const XUN_ORDER = ['shang', 'zhong', 'xia'] as const
const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'] as const

export function addOneTick(date: GameDate): GameDate {
  const xunIndex = XUN_ORDER.indexOf(date.xun)
  if (xunIndex < 2) return { ...date, xun: XUN_ORDER[xunIndex + 1]! }

  if (date.month < 3) return { ...date, month: (date.month + 1) as 1 | 2 | 3, xun: 'shang' }

  const seasonIndex = SEASON_ORDER.indexOf(date.season)
  if (seasonIndex < 3) return { ...date, season: SEASON_ORDER[seasonIndex + 1]!, month: 1, xun: 'shang' }

  return { yearBC: advanceYear(date.yearBC), season: 'spring', month: 1, xun: 'shang' }
}

function advanceYear(yearBC: number): number {
  if (yearBC === 1) return -1
  return yearBC > 1 ? yearBC - 1 : yearBC - 1
}

export function tickToGameDate(tick: number, initial: GameDate): GameDate {
  let date = { ...initial }
  for (let i = 0; i < tick; i += 1) date = addOneTick(date)
  return date
}

export function formatGameDate(date: GameDate): string {
  const yearStr = date.yearBC > 0 ? `公元前 ${date.yearBC} 年` : `公元 ${-date.yearBC} 年`
  const seasonMap: Record<GameDate['season'], string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
  const xunMap: Record<GameDate['xun'], string> = { shang: '上旬', zhong: '中旬', xia: '下旬' }
  return `${yearStr} ${seasonMap[date.season]} ${xunMap[date.xun]}`
}
