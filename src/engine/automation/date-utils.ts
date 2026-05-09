import type { GameDate } from '~/shared/types'

type Season = GameDate['season']
type Xun = GameDate['xun']

const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter']
const XUNS: readonly Xun[] = ['shang', 'zhong', 'xia']

export const SCENARIO_START_DATES: Record<'m9' | 'm1', GameDate> = {
  m9: { yearBC: 453, season: 'spring', month: 1, xun: 'shang' },
  m1: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
}

// 1 旬 = 1 tick; 1 月 = 3 旬; 1 季 = 3 月 = 9 旬; 1 年 = 4 季 = 36 旬
export function gameDateToTick(date: GameDate, scenarioStart: GameDate): number {
  const yearOffset = scenarioStart.yearBC - date.yearBC // BC is reversed
  const seasonOffset = SEASONS.indexOf(date.season) - SEASONS.indexOf(scenarioStart.season)
  const monthOffset = (date.month - scenarioStart.month) % 3
  const xunOffset = XUNS.indexOf(date.xun) - XUNS.indexOf(scenarioStart.xun)
  return yearOffset * 36 + seasonOffset * 9 + monthOffset * 3 + xunOffset
}
