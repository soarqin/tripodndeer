import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setCombatVarianceEnabled } from '~/engine/random'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { Army, DiplomacyEvent, RNGState, Site, World } from '~/shared/types'
import { combatV2Step } from '../combat-v2-step'

const rng: RNGState = { seed: 0, counter: 0 }

function makeArmy(overrides: Partial<Army> = {}): Army {
  return {
    id: 'army_attacker',
    realmId: 'realm_qin',
    manpower: 1000,
    location: 'site_1',
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
    ...overrides,
  }
}

function makeSite(
  id: string,
  ownerId: string | null,
  adjacency: readonly string[] = [],
): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency,
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
  } as Site
}

function makeWorld(armies: readonly Army[], sites: readonly Site[]): World {
  return makeEmptyWorld({
    sites: new Map(sites.map((site) => [site.id, site])),
    armies: new Map(armies.map((army) => [army.id, army])),
    rngState: rng,
  })
}

interface BattleResolvedPayload {
  readonly attackerRealmId: string
  readonly defenderRealmId: string | null
  readonly siteId: string
  readonly armySizeTotal: number
  readonly borderSite: boolean
}

function findBattleResolved(events: readonly { type: string; payload: unknown }[]): BattleResolvedPayload {
  const event = events.find((e) => e.type === 'battleResolved')
  expect(event).toBeDefined()
  return event!.payload as BattleResolvedPayload
}

describe('battleResolved payload extensions (T3.3)', () => {
  beforeEach(() => setCombatVarianceEnabled(false))
  afterEach(() => setCombatVarianceEnabled(true))

  it('emits armySizeTotal equal to attacker.manpower + sum(defender.manpower)', () => {
    const attacker = makeArmy({
      manpower: 1000,
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 500,
      location: 'site_2',
    })
    const world = makeWorld(
      [attacker, defender],
      [
        makeSite('site_1', 'realm_qin', ['site_2']),
        makeSite('site_2', 'realm_han', ['site_1']),
      ],
    )

    const result = combatV2Step(world, rng)
    const payload = findBattleResolved(result.events)

    expect(payload.armySizeTotal).toBe(1500)
  })

  it('emits borderSite=true when destination neighbours include attacker realm', () => {
    const attacker = makeArmy({
      manpower: 1000,
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 500,
      location: 'site_2',
    })
    const world = makeWorld(
      [attacker, defender],
      [
        makeSite('site_1', 'realm_qin', ['site_2']),
        makeSite('site_2', 'realm_han', ['site_1']),
      ],
    )

    const result = combatV2Step(world, rng)
    const payload = findBattleResolved(result.events)

    expect(payload.borderSite).toBe(true)
  })

  it('emits borderSite=false when destination has no attacker-owned neighbour', () => {
    const attacker = makeArmy({
      manpower: 1000,
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 500,
      location: 'site_2',
    })
    const world = makeWorld(
      [attacker, defender],
      [
        makeSite('site_1', 'realm_qin', []),
        makeSite('site_2', 'realm_han', ['site_3']),
        makeSite('site_3', 'realm_han', ['site_2']),
      ],
    )

    const result = combatV2Step(world, rng)
    const payload = findBattleResolved(result.events)

    expect(payload.borderSite).toBe(false)
  })

  it('appends combat_observed entry to diplomacyHistory with combatPayload', () => {
    const attacker = makeArmy({
      manpower: 1000,
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 500,
      location: 'site_2',
    })
    const world = makeWorld(
      [attacker, defender],
      [
        makeSite('site_1', 'realm_qin', ['site_2']),
        makeSite('site_2', 'realm_han', ['site_1']),
      ],
    )

    const result = combatV2Step(world, rng)
    const lastEntry = result.world.diplomacyHistory.at(-1) as DiplomacyEvent | undefined

    expect(lastEntry).toBeDefined()
    expect(lastEntry!.kind).toBe('combat_observed')
    expect(lastEntry!.actorRealmId).toBe('realm_qin')
    expect(lastEntry!.targetRealmId).toBe('realm_han')
    expect(lastEntry!.combatPayload).toEqual({
      armySizeTotal: 1500,
      borderSite: true,
      victorRealmId: 'realm_qin',
    })
  })

  it('records defender as victor when defender wins', () => {
    const attacker = makeArmy({
      manpower: 200,
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 2000,
      location: 'site_2',
    })
    const world = makeWorld(
      [attacker, defender],
      [
        makeSite('site_1', 'realm_qin', ['site_2']),
        makeSite('site_2', 'realm_han', ['site_1']),
      ],
    )

    const result = combatV2Step(world, rng)
    const lastEntry = result.world.diplomacyHistory.at(-1) as DiplomacyEvent | undefined

    expect(lastEntry?.combatPayload?.victorRealmId).toBe('realm_han')
  })

  it('skips diplomacyHistory entry when destination has no defender realm', () => {
    const attacker = makeArmy({
      manpower: 1000,
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
    })
    const world = makeWorld(
      [attacker],
      [
        makeSite('site_1', 'realm_qin', ['site_2']),
        makeSite('site_2', null, ['site_1']),
      ],
    )

    const result = combatV2Step(world, rng)

    expect(result.world.diplomacyHistory).toHaveLength(0)
    const payload = findBattleResolved(result.events)
    expect(payload.borderSite).toBe(false)
    expect(payload.armySizeTotal).toBe(1000)
  })

  it('emits a diplomacyEvent game event alongside combat_observed', () => {
    const attacker = makeArmy({
      manpower: 1000,
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 500,
      location: 'site_2',
    })
    const world = makeWorld(
      [attacker, defender],
      [
        makeSite('site_1', 'realm_qin', ['site_2']),
        makeSite('site_2', 'realm_han', ['site_1']),
      ],
    )

    const result = combatV2Step(world, rng)
    const diplomacyEvents = result.events.filter((e) => e.type === 'diplomacyEvent')

    expect(diplomacyEvents).toHaveLength(1)
    expect((diplomacyEvents[0]!.payload as DiplomacyEvent).kind).toBe('combat_observed')
  })
})
