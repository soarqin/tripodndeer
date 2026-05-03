import { describe, expect, it } from 'vitest'
import { GeneralSchema } from '../schemas'
import type { General } from '../types'

describe('M6 General.almaMater', () => {
  it('allows generals to reference an academy as optional almaMater', () => {
    const general: General = {
      id: 'general_xunzi',
      realmId: 'realm_qi',
      name: 'Xunzi',
      might: 6,
      command: 8,
      loyalty: 85,
      almaMater: 'academy_jixia',
    }

    expect(general.almaMater).toBe('academy_jixia')
  })

  it('keeps almaMater optional for legacy generals', () => {
    const general: General = {
      id: 'general_bai_qi',
      realmId: 'realm_qin',
      name: 'Bai Qi',
      might: 18,
      command: 16,
      loyalty: 80,
    }

    expect(general.almaMater).toBeUndefined()
  })

  it('GeneralSchema accepts optional almaMater when present', () => {
    const result = GeneralSchema.safeParse({
      id: 'general_xunzi',
      realmId: 'realm_qi',
      name: 'Xunzi',
      might: 6,
      command: 8,
      loyalty: 85,
      almaMater: 'academy_jixia',
    })

    expect(result.success).toBe(true)
  })
})
