import { describe, it, expect } from 'vitest'
import { makeEmptyWorld, makeM6World } from './fixtures'
import type { Academy } from '../types'

describe('World.academies', () => {
  it('makeEmptyWorld includes academies as empty Map', () => {
    const world = makeEmptyWorld()
    expect(world.academies).toBeInstanceOf(Map)
    expect(world.academies.size).toBe(0)
  })

  it('makeM6World accepts academies override', () => {
    const academy: Academy = {
      id: 'jixia',
      hostRealmId: 'realm_qi',
      hostSiteId: 'site_qi_capital',
      primaryIdeology: 'ru',
      secondaryIdeology: 'dao',
      founded: 318,
      level: 1,
      status: 'active',
    }
    const world = makeM6World({ academies: new Map([['jixia', academy]]) })
    expect(world.academies.size).toBe(1)
    expect(world.academies.get('jixia')?.primaryIdeology).toBe('ru')
  })

  it('makeM6World with no args returns world with empty academies', () => {
    const world = makeM6World()
    expect(world.academies.size).toBe(0)
  })
})
