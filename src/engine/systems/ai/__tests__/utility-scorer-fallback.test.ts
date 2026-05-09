import { describe, expect, it } from 'vitest'
import { getPersonality } from '../index'
import type { Realm, RulerState, World } from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'

function createMockWorld(
  realmId: string,
  realm: Partial<Realm> = {},
  ruler: Partial<RulerState> | null = null
): World {
  const world = makeEmptyWorld()
  const realms = new Map(world.realms)
  realms.set(realmId, { id: realmId, ...realm } as Realm)

  const rulers = new Map(world.rulers)
  if (ruler) {
    rulers.set(realmId, { realmId, ...ruler } as RulerState)
  }

  return { ...world, realms, rulers }
}

describe('utility scorer personality fallback', () => {
  it("returns 'incompetent' when ruler is missing", () => {
    const world = createMockWorld('realm_qin')

    expect(getPersonality(world, 'realm_qin')).toBe('incompetent')
  })

  it('uses ruler.personality when present', () => {
    const world = createMockWorld('realm_qin', {}, { personality: 'learned' })

    expect(getPersonality(world, 'realm_qin')).toBe('learned')
  })
})
