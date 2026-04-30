import { describe, expect, it } from 'vitest'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'

describe('generals loading', () => {
  it('world has 20+ generals', () => {
    const world = createWorldFromM1Data(loadM1Data(), 99, 'realm_qin')
    expect(world.generals.size).toBeGreaterThanOrEqual(20)
  })

  it('each realm has at least 1 general', () => {
    const world = createWorldFromM1Data(loadM1Data(), 99, 'realm_qin')
    const realmIds = ['realm_qin', 'realm_chu', 'realm_qi', 'realm_yan', 'realm_han', 'realm_zhao', 'realm_wei', 'realm_zhou']
    for (const realmId of realmIds) {
      const hasGeneral = [...world.generals.values()].some(g => g.realmId === realmId)
      expect(hasGeneral, `${realmId} should have at least 1 general`).toBe(true)
    }
  })

  it('all generals have valid attribute ranges', () => {
    const world = createWorldFromM1Data(loadM1Data(), 99, 'realm_qin')
    for (const general of world.generals.values()) {
      expect(general.might).toBeGreaterThanOrEqual(10)
      expect(general.might).toBeLessThanOrEqual(20)
      expect(general.loyalty).toBeGreaterThanOrEqual(0)
      expect(general.loyalty).toBeLessThanOrEqual(100)
    }
  })
})
