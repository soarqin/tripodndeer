import { describe, expect, it } from 'vitest'
import { createInitialRng } from '~/engine/random'
import { aiStrategicStep } from '../strategic'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { Realm, RealmId, RulerState, World } from '~/shared/types'

const playerRealmId = 'realm_player'
const aiRealmId = 'realm_ai'
const inactiveRealmId = 'realm_inactive'

function makeRealm(id: RealmId, status?: Realm['status']): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    status,
  }
}

function makeRuler(realmId: RealmId): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 40,
    lifespan: 70,
    health: 100,
    personality: 'conqueror',
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
  }
}

function makeWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 36,
    playerRealmId,
    realms: new Map([
      [playerRealmId, makeRealm(playerRealmId)],
      [aiRealmId, makeRealm(aiRealmId)],
      [inactiveRealmId, makeRealm(inactiveRealmId, 'deactivated')],
    ]),
    rulers: new Map([
      [aiRealmId, makeRuler(aiRealmId)],
      [inactiveRealmId, makeRuler(inactiveRealmId)],
    ]),
    ...overrides,
  })
}

describe('strategic edge cases', () => {
  it('populates empty aiState on the first yearly tick', () => {
    const result = aiStrategicStep(makeWorld({ aiState: new Map() }), createInitialRng(42))

    expect(result.world.aiState.get(aiRealmId)).toMatchObject({
      strategic: expect.any(Object),
    })
    expect(result.events.map((event) => event.type)).toContain('aiStrategicDecided')
  })

  it('no-ops gracefully in single-realm scenarios', () => {
    const world = makeEmptyWorld({
      date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      tick: 36,
      playerRealmId,
      realms: new Map([[playerRealmId, makeRealm(playerRealmId)]]),
      aiState: new Map(),
    })

    const rng = createInitialRng(42)
    const result = aiStrategicStep(world, rng)

    expect(result.world).toBe(world)
    expect(result.nextRng).toEqual(rng)
    expect(result.events).toEqual([])
  })

  it('does not generate aiState entries for deactivated realms', () => {
    const result = aiStrategicStep(makeWorld(), createInitialRng(42))

    expect(result.world.aiState.has(inactiveRealmId)).toBe(false)
    expect(result.world.aiState.get(aiRealmId)).toBeDefined()
  })
})
