import { describe, expect, it } from 'vitest'

import { rulerLifecyclePhase } from '../ruler-lifecycle'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { General, Realm, RealmId, RulerState, World } from '~/shared/types'
import { memoryKey, type DiplomaticMemory } from '~/shared/types/diplomatic-memory'

const rng = { seed: 42, counter: 0 }
const yearStart = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' } as const

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `site_${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: {
      treasury: 1000,
      foodStores: 1000,
      taxRate: 0.1,
    },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
  }
}

function makeRuler(realmId: RealmId): RulerState {
  return {
    realmId,
    generalId: `ruler_${realmId}`,
    age: 64,
    lifespan: 65,
    health: 50,
    personality: 'steward',
    personalityDims: {
      expansionDrive: 0.5,
      diplomaticTrust: 0.5,
      caution: 0.5,
      honor: 0.5,
      vindictiveness: 0.5,
      reformInclination: 0.5,
      patience: 0.5,
      preferredStrategy: 'diplomatic',
    },
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function makeHeir(realmId: RealmId): General {
  return {
    id: `heir_${realmId}`,
    realmId,
    name: `Heir ${realmId}`,
    might: 60,
    command: 60,
    loyalty: 80,
    attrs: { wu: 10, zheng: 10, jiao: 10, mou: 10, xue: 10, po: 10 },
    specialty: 'administrator',
  }
}

function makeMemory(): DiplomaticMemory {
  return {
    observerId: 'realm_qin',
    subjectId: 'realm_zhao',
    betrayalScore: 1,
    events: [],
    lastUpdatedTick: 0,
    lastObservedHistoryIdx: 0,
  }
}

describe('rulerLifecyclePhase diplomatic memory clear', () => {
  it('clears outgoing memories on ruler change and preserves incoming memories', () => {
    const realmId = 'realm_qin'
    const outgoingKey = memoryKey(realmId, 'realm_zhao')
    const incomingKey = memoryKey('realm_zhao', realmId)
    const originalMemory = new Map([[outgoingKey, makeMemory()], [incomingKey, makeMemory()]])

    const world: World = makeEmptyWorld({
      date: yearStart,
      playerRealmId: 'realm_han',
      realms: new Map([[realmId, makeRealm(realmId)]]),
      generals: new Map([[`heir_${realmId}`, makeHeir(realmId)]]),
      rulers: new Map([[realmId, makeRuler(realmId)]]),
      diplomaticMemory: originalMemory,
    })

    const result = rulerLifecyclePhase(world, rng)

    expect(result.world.diplomaticMemory).not.toBe(originalMemory)
    expect(result.world.diplomaticMemory.has(outgoingKey)).toBe(false)
    expect(result.world.diplomaticMemory.has(incomingKey)).toBe(true)
    expect(world.diplomaticMemory.has(outgoingKey)).toBe(true)
    expect(world.diplomaticMemory.has(incomingKey)).toBe(true)
  })
})
