import { describe, expect, it } from 'vitest'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { makeEmptyWorld } from './fixtures'

const data = loadM1Data()

describe('M6 Site fields', () => {
  it('createWorldFromM1Data initializes every site with M6 cultural fields', () => {
    const world = createWorldFromM1Data(data, 1, 'realm_qin')

    expect(world.sites.size).toBeGreaterThan(0)
    for (const site of world.sites.values()) {
      expect(site.cultural).toBeDefined()
      expect(site.culturalIdentityStrength).toBe(100)
      expect(site.lastConquestTick).toBeNull()
      expect(site.lowIdentitySinceTick).toBeNull()
    }
  })

  it('derives Qin site culture from owner realm', () => {
    const world = createWorldFromM1Data(data, 1, 'realm_qin')
    const qinSite = [...world.sites.values()].find((site) => site.ownerId === 'realm_qin')

    expect(qinSite?.cultural).toBe('chinese_qin')
  })

  it('derives Zhou central culture from owner realm', () => {
    const world = createWorldFromM1Data(data, 1, 'realm_qin')
    const zhouSite = [...world.sites.values()].find((site) => site.ownerId === 'realm_zhou')

    expect(zhouSite?.cultural).toBe('chinese_zhou_central')
  })

  it('makeEmptyWorld supplies M6 defaults for site overrides', () => {
    const world = makeEmptyWorld({
      sites: new Map([
        ['site_test', {
          id: 'site_test',
          name: 'Test Site',
          position: [0, 0],
          boundary: [],
          ownerId: null,
          polygon: [],
          adjacency: [],
          economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
        }],
      ]),
    })

    const site = world.sites.get('site_test')
    expect(site?.cultural).toBe('di_xirong')
    expect(site?.culturalIdentityStrength).toBe(100)
    expect(site?.lastConquestTick).toBeNull()
    expect(site?.lowIdentitySinceTick).toBeNull()
  })
})
