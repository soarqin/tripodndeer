import { describe, expect, it } from 'vitest'

import type { World } from '~/shared/types/world'

import { isAIRealm } from '../sentinels'

function createWorld(playerRealmId: World['playerRealmId']): World {
  return { playerRealmId } as unknown as World
}

describe('isAIRealm', () => {
  it('returns false for the player realm in a normal match', () => {
    const world = createWorld('realm_qin')

    expect(isAIRealm(world, 'realm_qin')).toBe(false)
  })

  it('returns true for non-player realms in a normal match', () => {
    const world = createWorld('realm_qin')

    expect(isAIRealm(world, 'realm_zhao')).toBe(true)
  })

  it('treats all realms as AI when using the AI-only sentinel', () => {
    const world = createWorld('__ai_only__')

    expect(isAIRealm(world, 'realm_qin')).toBe(true)
    expect(isAIRealm(world, 'realm_zhao')).toBe(true)
  })
})
