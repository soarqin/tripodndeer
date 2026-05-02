import { describe, it, expect } from 'vitest'
import { manpowerTick } from '../manpower'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { warKey } from '~/engine/wars'
import type { World } from '~/shared/types'

describe('manpower tick', () => {
  it('skip on non-monthly tick', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const worldAtTick1 = { ...world, tick: 1 }
    const result = manpowerTick(worldAtTick1 as World, world.rngState)
    expect(result.world).toBe(worldAtTick1)
  })

  it('recovers 500 manpower per month at peace', () => {
    const base = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const qin = base.realms.get('realm_qin')!
    const realms = new Map(base.realms)
    realms.set('realm_qin', { ...qin, traits: [], stats: { manpowerPool: 0, manpowerCap: 80000, warWeariness: 0 } })
    const world = { ...base, realms, tick: 0 } as World
    const result = manpowerTick(world, world.rngState)
    expect(result.world.realms.get('realm_qin')!.stats?.manpowerPool).toBe(500)
    expect(result.world.realms.get('realm_qin')!.stats?.warWeariness).toBe(0)
  })

  it('12-month war simulation: weariness=60, manpowerPool=4500', () => {
    const base = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const qin = base.realms.get('realm_qin')!

    const realms = new Map(base.realms)
    realms.set('realm_qin', { ...qin, traits: [], stats: { manpowerPool: 0, manpowerCap: 80000, warWeariness: 0 } })

    const wars = new Map(base.wars)
    wars.set(warKey('realm_qin', 'realm_zhao'), {
      casusBelli: 'revenge',
      declaredAt: base.date,
      occupiedSites: new Map(),
      peaceProposalId: null,
    })

    let world = { ...base, realms, wars, tick: 0 } as World

    for (let i = 0; i < 12; i++) {
      const result = manpowerTick(world, world.rngState)
      world = { ...result.world, tick: (i + 1) * 3 } as World
    }

    const qinFinal = world.realms.get('realm_qin')!
    expect(qinFinal.stats?.warWeariness).toBe(60)
    expect(qinFinal.stats?.manpowerPool).toBe(4500)
  })

  it('manpower capped at manpowerCap', () => {
    const base = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const qin = base.realms.get('realm_qin')!
    const realms = new Map(base.realms)
    realms.set('realm_qin', { ...qin, traits: [], stats: { manpowerPool: 79900, manpowerCap: 80000, warWeariness: 0 } })
    const world = { ...base, realms, tick: 0 } as World
    const result = manpowerTick(world, world.rngState)
    expect(result.world.realms.get('realm_qin')!.stats?.manpowerPool).toBe(80000)
  })
})
