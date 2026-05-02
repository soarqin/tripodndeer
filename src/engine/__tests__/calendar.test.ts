import { describe, expect, it } from 'vitest'
import { isYearStart } from '../calendar'
import { makeTestWorld } from './world-test-fixtures'
import type { GameDate, World } from '~/shared/types'

function worldWithDate(date: GameDate): World {
  return makeTestWorld({ date })
}

describe('isYearStart', () => {
  it('returns true when season=spring, month=1, xun=shang', () => {
    const world = worldWithDate({ yearBC: 260, season: 'spring', month: 1, xun: 'shang' })
    expect(isYearStart(world)).toBe(true)
  })

  it('returns false when xun=zhong (mid first month)', () => {
    const world = worldWithDate({ yearBC: 260, season: 'spring', month: 1, xun: 'zhong' })
    expect(isYearStart(world)).toBe(false)
  })

  it('returns false when xun=xia (late first month)', () => {
    const world = worldWithDate({ yearBC: 260, season: 'spring', month: 1, xun: 'xia' })
    expect(isYearStart(world)).toBe(false)
  })

  it('returns false when month=2 (later in spring)', () => {
    const world = worldWithDate({ yearBC: 260, season: 'spring', month: 2, xun: 'shang' })
    expect(isYearStart(world)).toBe(false)
  })

  it('returns false when month=3 (last month of spring)', () => {
    const world = worldWithDate({ yearBC: 260, season: 'spring', month: 3, xun: 'xia' })
    expect(isYearStart(world)).toBe(false)
  })

  it('returns false when season=summer', () => {
    const world = worldWithDate({ yearBC: 260, season: 'summer', month: 1, xun: 'shang' })
    expect(isYearStart(world)).toBe(false)
  })

  it('returns false when season=autumn', () => {
    const world = worldWithDate({ yearBC: 260, season: 'autumn', month: 1, xun: 'shang' })
    expect(isYearStart(world)).toBe(false)
  })

  it('returns false when season=winter', () => {
    const world = worldWithDate({ yearBC: 260, season: 'winter', month: 1, xun: 'shang' })
    expect(isYearStart(world)).toBe(false)
  })
})
