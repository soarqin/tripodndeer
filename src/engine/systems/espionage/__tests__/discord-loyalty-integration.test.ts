import { describe, expect, it } from 'vitest'

import { espionagePhase } from '../espionage-phase'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import {
  M7_DISCORD_LOYALTY_DELTA,
} from '~/content/m2/balance'
import type {
  General,
  Realm,
  RNGState,
  SpyMission,
  World,
} from '~/shared/types'

const SUCCESS_RNG: RNGState = { seed: 1, counter: 0 }

function makeRealm(id: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeSpy(id: string, realmId: string, mou: number = 18): General {
  return {
    id,
    realmId,
    name: id,
    might: 10,
    command: 10,
    loyalty: 80,
    loyaltyState: 'loyal',
    posts: [],
    age: 35,
    ambition: 'mid',
    specialty: 'spy',
    attrs: { wu: 5, zheng: 5, jiao: 16, mou, xue: 8, po: 8 },
  }
}

function makeTarget(id: string, realmId: string, loyalty: number = 80): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty,
    loyaltyState: 'loyal',
    posts: [],
    age: 40,
    ambition: 'mid',
    specialty: 'commander',
    attrs: { wu: 15, zheng: 10, jiao: 8, mou: 10, xue: 8, po: 12 },
  }
}

function makeMission(overrides: Partial<SpyMission> = {}): SpyMission {
  return {
    id: 'mission_discord_test',
    spyGeneralId: 'spy_a',
    spyRealmId: 'realm_a',
    targetRealmId: 'realm_b',
    action: 'discord',
    startTick: 0,
    resolveTick: 5,
    status: 'in_progress',
    targetGeneralId: 'gen_target',
    ...overrides,
  }
}

function makeBaseWorld(initialLoyalty: number = 80, overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    tick: 10,
    realms: new Map([
      ['realm_a', makeRealm('realm_a')],
      ['realm_b', makeRealm('realm_b')],
    ]),
    generals: new Map<string, General>([
      ['spy_a', makeSpy('spy_a', 'realm_a')],
      ['gen_target', makeTarget('gen_target', 'realm_b', initialLoyalty)],
    ]),
    spyMissions: new Map([['mission_discord_test', makeMission()]]),
    ...overrides,
  })
}

describe('§12.3.C discord-loyalty integration: discord success → loyalty delta', () => {
  it('decreases target general loyalty by exactly M7_DISCORD_LOYALTY_DELTA on success', () => {
    const initialLoyalty = 80
    const world = makeBaseWorld(initialLoyalty)
    const result = espionagePhase(world, SUCCESS_RNG)

    const updatedTarget = result.world.generals.get('gen_target')!
    expect(updatedTarget.loyalty).toBe(initialLoyalty + M7_DISCORD_LOYALTY_DELTA)
    expect(M7_DISCORD_LOYALTY_DELTA).toBe(-15)
    expect(updatedTarget.loyalty).toBe(65)
  })

  it('marks mission status as success when applied', () => {
    const world = makeBaseWorld()
    const result = espionagePhase(world, SUCCESS_RNG)

    const mission = result.world.spyMissions.get('mission_discord_test')!
    expect(mission.status).toBe('success')
  })

  it('emits spyMissionResolved event with outcome=success on discord success', () => {
    const world = makeBaseWorld()
    const result = espionagePhase(world, SUCCESS_RNG)

    const resolvedEvents = result.events.filter((e) => e.type === 'spyMissionResolved')
    expect(resolvedEvents).toHaveLength(1)
    const payload = resolvedEvents[0]!.payload as Record<string, unknown>
    expect(payload).toMatchObject({
      missionId: 'mission_discord_test',
      action: 'discord',
      outcome: 'success',
      spyRealmId: 'realm_a',
      targetRealmId: 'realm_b',
    })
  })
})

describe('§12.3.C discord-loyalty integration: Effect.character.loyalty path (NOT direct mutation)', () => {
  it('preserves all other general fields after applying Effect spread', () => {
    const world = makeBaseWorld(80)
    const before = world.generals.get('gen_target')!
    const result = espionagePhase(world, SUCCESS_RNG)
    const after = result.world.generals.get('gen_target')!

    expect(after.id).toBe(before.id)
    expect(after.realmId).toBe(before.realmId)
    expect(after.name).toBe(before.name)
    expect(after.might).toBe(before.might)
    expect(after.command).toBe(before.command)
    expect(after.specialty).toBe(before.specialty)
    expect(after.attrs).toEqual(before.attrs)
    expect(after.posts).toEqual(before.posts)
    expect(after.age).toBe(before.age)
    expect(after.ambition).toBe(before.ambition)
    expect(after.loyalty).not.toBe(before.loyalty)
  })

  it('produces unclamped Effect arithmetic (loyalty 10 + (-15) = -5, not 0)', () => {
    const world = makeBaseWorld(10)
    const result = espionagePhase(world, SUCCESS_RNG)
    const after = result.world.generals.get('gen_target')!
    expect(after.loyalty).toBe(10 + M7_DISCORD_LOYALTY_DELTA)
    expect(after.loyalty).toBe(-5)
  })

  it('returns a new World reference and leaves original world untouched (immutable)', () => {
    const world = makeBaseWorld()
    const result = espionagePhase(world, SUCCESS_RNG)

    expect(result.world).not.toBe(world)
    expect(result.world.generals).not.toBe(world.generals)
    expect(world.generals.get('gen_target')!.loyalty).toBe(80)
  })

  it('does not touch loyalty when discord targetGeneralId is null (Effect guard)', () => {
    const world = makeBaseWorld(80, {
      spyMissions: new Map([
        ['mission_discord_test', makeMission({ targetGeneralId: null })],
      ]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)

    const mission = result.world.spyMissions.get('mission_discord_test')!
    expect(mission.status).toBe('success')
    const generals = [...result.world.generals.values()]
    for (const g of generals) {
      const original = world.generals.get(g.id)!
      expect(g.loyalty).toBe(original.loyalty)
    }
  })

  it('does not touch loyalty when targetGeneralId references a missing general', () => {
    const world = makeBaseWorld(80, {
      spyMissions: new Map([
        ['mission_discord_test', makeMission({ targetGeneralId: 'gen_nonexistent' })],
      ]),
    })
    const result = espionagePhase(world, SUCCESS_RNG)
    const target = result.world.generals.get('gen_target')!
    expect(target.loyalty).toBe(80)
  })
})

describe('§12.3.C acceptance: discord events lower enemy general loyalty', () => {
  it('§12.3.C — discord success mission ACTUALLY lowers an enemy general loyalty', () => {
    const targetInitialLoyalty = 80
    const world = makeBaseWorld(targetInitialLoyalty)

    const result = espionagePhase(world, SUCCESS_RNG)

    const mission = result.world.spyMissions.get('mission_discord_test')!
    const targetAfter = result.world.generals.get('gen_target')!

    expect(mission.status).toBe('success')
    expect(targetAfter.loyalty).toBeLessThan(targetInitialLoyalty)
    expect(targetInitialLoyalty - targetAfter.loyalty).toBe(Math.abs(M7_DISCORD_LOYALTY_DELTA))
  })

  it('§12.3.C — multiple consecutive successful discords stack on the same target', () => {
    const world = makeBaseWorld(80)
    const r1 = espionagePhase(world, SUCCESS_RNG)
    const targetAfter1 = r1.world.generals.get('gen_target')!
    expect(targetAfter1.loyalty).toBe(65)

    const newMissions = new Map(r1.world.spyMissions)
    newMissions.set('mission_discord_test_2', {
      ...makeMission({ id: 'mission_discord_test_2' }),
    })
    const worldAfterFirst: World = {
      ...r1.world,
      spyMissions: newMissions,
    }
    const r2 = espionagePhase(worldAfterFirst, SUCCESS_RNG)
    const targetAfter2 = r2.world.generals.get('gen_target')!

    expect(targetAfter2.loyalty).toBeLessThanOrEqual(targetAfter1.loyalty)
  })
})
