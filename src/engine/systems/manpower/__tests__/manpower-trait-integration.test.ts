import { describe, expect, it } from 'vitest'

import { manpowerTick } from '../manpower'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { Realm, World } from '~/shared/types'

function makeRealmWithStats(
  id: string,
  traits: readonly string[],
  manpowerPool: number,
  manpowerCap: number,
): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits,
    politicalSystem: 'enfeoffment',
    stats: { manpowerPool, manpowerCap, warWeariness: 0 },
  }
}

function makeWorldWithRealm(realm: Realm): World {
  return makeEmptyWorld({
    realms: new Map([[realm.id, realm]]),
    tick: 0,
    playerRealmId: realm.id,
  })
}

describe('manpower trait integration', () => {
  it('hu_fu_qi_she_done trait increases manpowerCap by 15%', () => {
    const baseRealm = makeRealmWithStats('realm_zhao', [], 79900, 80000)
    const traitRealm = makeRealmWithStats('realm_zhao', ['hu_fu_qi_she_done'], 79900, 80000)

    const baseResult = manpowerTick(makeWorldWithRealm(baseRealm), { seed: 0, counter: 0 })
    const traitResult = manpowerTick(makeWorldWithRealm(traitRealm), { seed: 0, counter: 0 })

    const baseManpower = baseResult.world.realms.get('realm_zhao')!.stats!.manpowerPool
    const traitManpower = traitResult.world.realms.get('realm_zhao')!.stats!.manpowerPool

    expect(baseManpower).toBe(80000)
    expect(traitManpower).toBe(80450)
  })

  it('shang_yang_reform_done trait increases manpowerCap by 20%', () => {
    const baseRealm = makeRealmWithStats('realm_qin', [], 79900, 80000)
    const traitRealm = makeRealmWithStats('realm_qin', ['shang_yang_reform_done'], 79900, 80000)

    const baseResult = manpowerTick(makeWorldWithRealm(baseRealm), { seed: 0, counter: 0 })
    const traitResult = manpowerTick(makeWorldWithRealm(traitRealm), { seed: 0, counter: 0 })

    const baseManpower = baseResult.world.realms.get('realm_qin')!.stats!.manpowerPool
    const traitManpower = traitResult.world.realms.get('realm_qin')!.stats!.manpowerPool

    expect(baseManpower).toBe(80000)
    expect(traitManpower).toBe(80475)
  })

  it('shang_yang_reform_done trait increases recruitment speed by 15%', () => {
    const baseRealm = makeRealmWithStats('realm_qin', [], 0, 100000)
    const traitRealm = makeRealmWithStats('realm_qin', ['shang_yang_reform_done'], 0, 100000)

    const baseResult = manpowerTick(makeWorldWithRealm(baseRealm), { seed: 0, counter: 0 })
    const traitResult = manpowerTick(makeWorldWithRealm(traitRealm), { seed: 0, counter: 0 })

    const baseRecovery = baseResult.world.realms.get('realm_qin')!.stats!.manpowerPool
    const traitRecovery = traitResult.world.realms.get('realm_qin')!.stats!.manpowerPool

    expect(baseRecovery).toBe(500)
    expect(traitRecovery).toBe(575)
  })

  it('realm with no traits behaves identically to baseline (regression)', () => {
    const realm = makeRealmWithStats('realm_qi', [], 0, 80000)

    const result = manpowerTick(makeWorldWithRealm(realm), { seed: 0, counter: 0 })

    expect(result.world.realms.get('realm_qi')!.stats!.manpowerPool).toBe(500)
  })
})
