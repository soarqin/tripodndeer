import { describe, it, expect } from 'vitest'
import { DisasterDefinitionSchema } from '~/shared/schemas'
import fengNian from '../disasters/feng-nian.json'
import qianNian from '../disasters/qian-nian.json'
import daHan from '../disasters/da-han.json'
import daShui from '../disasters/da-shui.json'
import huangZai from '../disasters/huang-zai.json'
import wenYi from '../disasters/wen-yi.json'

const allDisasters = [fengNian, qianNian, daHan, daShui, huangZai, wenYi]

describe('disaster definition JSONs', () => {
  it('loads exactly 6 disaster definitions', () => {
    expect(allDisasters.length).toBe(6)
  })
  
  it('all 6 pass DisasterDefinitionSchema', () => {
    for (const d of allDisasters) {
      expect(() => DisasterDefinitionSchema.parse(d)).not.toThrow()
    }
  })
  
  it('each has exactly 4 playerChoices', () => {
    for (const d of allDisasters) {
      const parsed = DisasterDefinitionSchema.parse(d)
      expect(parsed.playerChoices.length).toBe(4)
    }
  })
  
  it('playerChoices cover all required IDs', () => {
    const requiredIds = new Set(['open_granary', 'reduce_tax', 'forced_levy', 'ignore'])
    for (const d of allDisasters) {
      const parsed = DisasterDefinitionSchema.parse(d)
      const choiceIds = new Set(parsed.playerChoices.map(c => c.id))
      for (const required of requiredIds) {
        expect(choiceIds.has(required), `${d.id} missing choice ${required}`).toBe(true)
      }
    }
  })
  
  it('all 6 have unique IDs', () => {
    const ids = allDisasters.map(d => d.id)
    expect(new Set(ids).size).toBe(6)
  })
  
  it('all IDs match expected M4.2 disaster types', () => {
    const expectedIds = new Set([
      'disaster_feng_nian', 'disaster_qian_nian', 'disaster_da_han',
      'disaster_da_shui', 'disaster_huang_zai', 'disaster_wen_yi'
    ])
    for (const d of allDisasters) {
      expect(expectedIds.has(d.id)).toBe(true)
    }
  })
  
  it('all disasters have non-empty displayNameZh', () => {
    for (const d of allDisasters) {
      const parsed = DisasterDefinitionSchema.parse(d)
      expect(parsed.displayNameZh.length).toBeGreaterThan(0)
    }
  })
})
