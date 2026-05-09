import { describe, expect, it } from 'vitest'
import { runTickPhases } from '~/engine/clock'
import { createInitialRng } from '~/engine/random'
import { aiOperationalStep } from '../operational'
import { aiStrategicStep } from '../strategic'
import { aiTacticalStep } from '../tactical-step'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { Realm, RealmId, RulerState, World } from '~/shared/types'

const playerRealmId = 'realm_player'
const aiRealmId = 'realm_ai'

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 1000, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
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

function makeWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    date: { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' },
    tick: 5,
    playerRealmId,
    realms: new Map([
      [playerRealmId, makeRealm(playerRealmId)],
      [aiRealmId, makeRealm(aiRealmId)],
    ]),
    rulers: new Map([[aiRealmId, makeRuler(aiRealmId)]]),
    aiState: new Map(),
    ...overrides,
  })
}

describe('per-layer RNG skip tests', () => {
  it('Strategic consumes zero RNG on non-yearly tick', () => {
    const world = makeWorld()
    const rng = createInitialRng(42)

    const result = aiStrategicStep(world, rng)

    expect(result.nextRng).toEqual(rng)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })

  it('Operational consumes zero RNG on non-shang xun', () => {
    const world = makeWorld({ date: { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' } })
    const rng = createInitialRng(42)

    const result = aiOperationalStep(world, rng)

    expect(result.nextRng).toEqual(rng)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })

  it('Tactical runs every tick (may consume RNG when actions taken)', () => {
    const world = makeWorld({ aiState: new Map([[aiRealmId, { strategic: null, operational: [] }]]) })
    const rng = createInitialRng(42)

    const result = aiTacticalStep(world, rng)

    expect(result.nextRng).toEqual(rng)
    expect(result.world).toEqual(world)
    expect(result.events).toEqual([])
  })

  it('Yearly cadence sanity: Strategic fires exactly once in 36 ticks', () => {
    let world = makeWorld({
      date: { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' },
      phases: [aiStrategicStep],
    })
    const rng = createInitialRng(42)
    let currentRng = rng
    let strategicTicks = 0

    for (let i = 0; i < 36; i += 1) {
      const result = runTickPhases(world, currentRng)
      world = result.world
      currentRng = result.nextRng
      if (result.events.some((event) => event.type === 'aiStrategicDecided')) {
        strategicTicks += 1
      }
    }

    expect(strategicTicks).toBe(1)
  })
})
