import { describe, expect, it } from 'vitest'

import { deactivateRealm } from '~/engine/wars/realm-deactivation'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { memoryKey } from '~/shared/types/diplomatic-memory'
import type { DiplomaticMemory, Realm, RealmId } from '~/shared/types'

function realm(id: RealmId, status: Realm['status'] = 'active'): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
    status,
  }
}

function memory(): DiplomaticMemory {
  return {
    observerId: 'realm_qin',
    subjectId: 'realm_han',
    betrayalScore: 0.5,
    events: [],
    lastUpdatedTick: 0,
    lastObservedHistoryIdx: 0,
  }
}

describe('deactivateRealm diplomatic memory pruning', () => {
  it('removes all incoming and outgoing memory entries for the deactivated realm', () => {
    const world = makeEmptyWorld({
      realms: new Map([
        ['realm_qin', realm('realm_qin')],
        ['realm_han', realm('realm_han')],
        ['realm_wei', realm('realm_wei')],
      ]),
      diplomaticMemory: new Map([
        [memoryKey('realm_han', 'realm_qin'), memory()],
        [memoryKey('realm_qin', 'realm_han'), memory()],
        [memoryKey('realm_qin', 'realm_wei'), { ...memory(), subjectId: 'realm_wei' }],
      ]),
    })

    const result = deactivateRealm(world, 'realm_han', 'conquered')

    expect(result.world.diplomaticMemory.has(memoryKey('realm_han', 'realm_qin'))).toBe(false)
    expect(result.world.diplomaticMemory.has(memoryKey('realm_qin', 'realm_han'))).toBe(false)
    expect(result.world.diplomaticMemory.has(memoryKey('realm_qin', 'realm_wei'))).toBe(true)
  })
})
