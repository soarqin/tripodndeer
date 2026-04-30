import { describe, expect, it } from 'vitest'
import casusBelliData from '../casus-belli.json'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { getWarState, isAtWar } from '~/engine/wars'
import { applyOrder } from '~/engine/systems/orders'

describe('casus belli', () => {
  it('5 casus belli with positive peaceModifier', () => {
    expect(casusBelliData).toHaveLength(5)
    for (const cb of casusBelliData) {
      expect(cb.peaceModifier).toBeGreaterThan(0)
    }
  })

  it('declare-war order creates war with casusBelli', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const result = applyOrder(world, { type: 'declare-war', targetRealmId: 'realm_zhao', casusBelli: 'revenge' })
    expect(isAtWar(result.world.wars, 'realm_qin', 'realm_zhao')).toBe(true)
    const state = getWarState(result.world.wars, 'realm_qin', 'realm_zhao')
    expect(state?.casusBelli).toBe('revenge')
  })
})
