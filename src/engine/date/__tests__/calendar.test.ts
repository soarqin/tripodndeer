import { describe, expect, it } from 'vitest'
import { INITIAL_DATE } from '@/shared/constants'
import { addOneTick, formatGameDate, tickToGameDate } from '../calendar'

describe('formatGameDate + tickToGameDate table', () => {
  const cases: [number, string][] = [
    [0, '公元前 453 年 春 上旬'],
    [1, '公元前 453 年 春 中旬'],
    [2, '公元前 453 年 春 下旬'],
    [3, '公元前 453 年 春 上旬'],
    [9, '公元前 453 年 夏 上旬'],
    [36, '公元前 452 年 春 上旬'],
  ]

  cases.forEach(([ticks, expected]) => {
    it(`tick=${ticks} → ${expected}`, () => {
      const date = tickToGameDate(ticks, INITIAL_DATE)
      expect(formatGameDate(date)).toBe(expected)
    })
  })
})

describe('addOneTick immutability', () => {
  it('does not mutate input', () => {
    const original = { ...INITIAL_DATE }
    const next = addOneTick(original)
    expect(original).toEqual(INITIAL_DATE)
    expect(next).not.toBe(original)
  })
})

describe('BC to AD transition (no year zero)', () => {
  it('BC 1 winter xia → AD 1 spring shang', () => {
    const last = { yearBC: 1, season: 'winter' as const, month: 3 as const, xun: 'xia' as const }
    const next = addOneTick(last)
    expect(next.yearBC).toBe(-1)
    expect(next.season).toBe('spring')
    expect(next.month).toBe(1)
    expect(next.xun).toBe('shang')
  })
})
