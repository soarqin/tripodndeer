import { describe, expect, it } from 'vitest'
import type { DiplomacyEvent, Realm, RealmId, World } from '~/shared/types'
import { makeEmptyWorld, TEST_WORLD_DATE } from '~/shared/__tests__/fixtures'
import { diplomaticMemoryPhase } from '../diplomatic-memory-phase'

const player: RealmId = 'realm_player'
const qin: RealmId = 'realm_qin'
const han: RealmId = 'realm_han'
const wei: RealmId = 'realm_wei'

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 1000, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
  }
}

function makeInitialWorld(): World {
  const history: DiplomacyEvent[] = [
    {
      id: 'evt_betrayal_qin_han',
      kind: 'betrayal',
      occurredAt: TEST_WORLD_DATE,
      actorRealmId: qin,
      targetRealmId: han,
      treatyKind: 'alliance',
    },
    {
      id: 'evt_combat_wei_qin',
      kind: 'combat_observed',
      occurredAt: TEST_WORLD_DATE,
      actorRealmId: wei,
      targetRealmId: qin,
      combatPayload: { armySizeTotal: 5000, borderSite: false, victorRealmId: wei },
    },
    {
      id: 'evt_war_han_wei',
      kind: 'war_declared',
      occurredAt: TEST_WORLD_DATE,
      actorRealmId: han,
      targetRealmId: wei,
      unprovoked: true,
    },
    {
      id: 'evt_spy_qin_wei',
      kind: 'spy_caught',
      occurredAt: TEST_WORLD_DATE,
      actorRealmId: qin,
      targetRealmId: wei,
      spyMissionId: 'spy_1',
    },
    {
      id: 'evt_skirmish_han_qin',
      kind: 'combat_observed',
      occurredAt: TEST_WORLD_DATE,
      actorRealmId: han,
      targetRealmId: qin,
      combatPayload: { armySizeTotal: 500, borderSite: true, victorRealmId: han },
    },
  ]

  return makeEmptyWorld({
    realms: new Map([
      [player, makeRealm(player)],
      [qin, makeRealm(qin)],
      [han, makeRealm(han)],
      [wei, makeRealm(wei)],
    ]),
    diplomacyHistory: history,
    playerRealmId: player,
    rngState: { seed: 42, counter: 0 },
  })
}

function simulate(initial: World, ticks: number): World {
  let current = initial
  for (let i = 0; i < ticks; i++) {
    const result = diplomaticMemoryPhase(current, current.rngState)
    current = { ...result.world, tick: i + 1, rngState: result.nextRng }
  }
  return current
}

describe('diplomaticMemoryPhase determinism', () => {
  it('produces identical memory state across two independent 100-tick runs with seed=42', () => {
    const initial = makeInitialWorld()

    const runA = simulate(initial, 100)
    const runB = simulate(initial, 100)

    const serializedA = JSON.stringify([...runA.diplomaticMemory.entries()])
    const serializedB = JSON.stringify([...runB.diplomaticMemory.entries()])

    expect(serializedA).toEqual(serializedB)
    expect(runA.diplomaticMemory.size).toBeGreaterThan(0)
  })
})
