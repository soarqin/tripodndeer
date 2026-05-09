import { describe, expect, it } from 'vitest'

import type { GameDate } from '~/shared/types'

import { gameDateToTick, SCENARIO_START_DATES } from '../date-utils'

describe('gameDateToTick', () => {
  const start: GameDate = SCENARIO_START_DATES.m9

  it('returns 0 for scenarioStart itself', () => {
    expect(gameDateToTick(start, start)).toBe(0)
  })

  it('returns 1 for +1 xun (shang -> zhong)', () => {
    const date: GameDate = { ...start, xun: 'zhong' }
    expect(gameDateToTick(date, start)).toBe(1)
  })

  it('returns 2 for +2 xun (shang -> xia)', () => {
    const date: GameDate = { ...start, xun: 'xia' }
    expect(gameDateToTick(date, start)).toBe(2)
  })

  it('returns 3 for +1 month (within same season)', () => {
    const date: GameDate = { ...start, month: 2 }
    expect(gameDateToTick(date, start)).toBe(3)
  })

  it('returns 9 for +1 season (spring -> summer)', () => {
    const date: GameDate = { ...start, season: 'summer' }
    expect(gameDateToTick(date, start)).toBe(9)
  })

  it('returns 36 for +1 year (BC reversed: 453 -> 452)', () => {
    const date: GameDate = { ...start, yearBC: 452 }
    expect(gameDateToTick(date, start)).toBe(36)
  })

  it('returns 37 for +1 year +1 xun', () => {
    const date: GameDate = { ...start, yearBC: 452, xun: 'zhong' }
    expect(gameDateToTick(date, start)).toBe(37)
  })

  it('handles m1 scenarioStart shape', () => {
    const m1Start = SCENARIO_START_DATES.m1
    expect(m1Start.yearBC).toBe(260)
    expect(m1Start.season).toBe('spring')
    expect(m1Start.month).toBe(1)
    expect(m1Start.xun).toBe('shang')
  })
})

describe('SCENARIO_START_DATES', () => {
  it('exposes m9 starting at 453 BC spring shang', () => {
    expect(SCENARIO_START_DATES.m9).toEqual({
      yearBC: 453,
      season: 'spring',
      month: 1,
      xun: 'shang',
    })
  })

  it('exposes m1 starting at 260 BC spring shang', () => {
    expect(SCENARIO_START_DATES.m1).toEqual({
      yearBC: 260,
      season: 'spring',
      month: 1,
      xun: 'shang',
    })
  })
})
