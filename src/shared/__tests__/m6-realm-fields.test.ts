import { describe, expect, it } from 'vitest'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { makeEmptyWorld } from './fixtures'

const data = loadM1Data()
const zeroLean = { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }

describe('M6 Realm fields', () => {
  it('createWorldFromM1Data initializes prestige tiers by realm id', () => {
    const world = createWorldFromM1Data(data, 1, 'realm_qin')

    expect(world.realms.get('realm_qin')?.prestige).toBe(70)
    expect(world.realms.get('realm_chu')?.prestige).toBe(70)
    expect(world.realms.get('realm_qi')?.prestige).toBe(70)
    expect(world.realms.get('realm_zhou')?.prestige).toBe(90)
    expect(world.realms.get('realm_zhao')?.prestige).toBe(55)
  })

  it('createWorldFromM1Data initializes ideology lean to zero baseline', () => {
    const world = createWorldFromM1Data(data, 1, 'realm_qin')

    expect(world.realms.get('realm_qin')?.ideologyLean).toEqual(zeroLean)
  })

  it('createWorldFromM1Data initializes yearly war victories to zero', () => {
    const world = createWorldFromM1Data(data, 1, 'realm_qin')

    for (const realm of world.realms.values()) {
      expect(realm.warVictoriesThisYear).toBe(0)
    }
  })

  it('makeEmptyWorld supplies M6 defaults for realm overrides', () => {
    const world = makeEmptyWorld({
      realms: new Map([
        ['realm_test', {
          id: 'realm_test',
          displayName: 'Test',
          fullTitle: 'Test Realm',
          color: '#123456',
          capital: 'site_test',
          initialSites: [],
          initialArmies: [],
          economy: { treasury: 0, foodStores: 0, taxRate: 10 },
          traits: [],
          politicalSystem: 'enfeoffment',
        }],
      ]),
    })

    const realm = world.realms.get('realm_test')
    expect(realm?.prestige).toBe(40)
    expect(realm?.ideologyLean).toEqual(zeroLean)
    expect(realm?.warVictoriesThisYear).toBe(0)
  })
})
