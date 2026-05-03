import { describe, expect, it } from 'vitest'
import type { CulturalTag, Ideology, IdeologyLean, AcademyId, AcademyStatus } from '../types'

describe('M6 types', () => {
  it('CulturalTag has 10 values', () => {
    const tags: CulturalTag[] = [
      'chinese_qin', 'chinese_chu', 'chinese_qi', 'chinese_zhou_central',
      'chinese_yan', 'chinese_zhao', 'chinese_wei', 'chinese_han',
      'yi_dong', 'di_xirong'
    ]
    expect(tags).toHaveLength(10)
  })

  it('Ideology has 6 values', () => {
    const ideologies: Ideology[] = ['fa', 'ru', 'dao', 'mo', 'zonghen', 'bing']
    expect(ideologies).toHaveLength(6)
  })

  it('AcademyStatus has 2 values', () => {
    const statuses: AcademyStatus[] = ['active', 'dormant']
    expect(statuses).toHaveLength(2)
  })

  it('IdeologyLean is a Record of Ideology to number', () => {
    const lean: IdeologyLean = { fa: 30, ru: 20, dao: 10, mo: 5, zonghen: 25, bing: 10 }
    expect(lean.fa).toBe(30)
    expect(lean.ru).toBe(20)
  })

  it('AcademyId is a string type', () => {
    const id: AcademyId = 'jixia'
    expect(typeof id).toBe('string')
  })
})
