import { describe, expect, it } from 'vitest'
import type { DiplomacyEvent, Realm, RealmId, World } from '~/shared/types'
import { makeEmptyWorld, TEST_WORLD_DATE } from '~/shared/__tests__/fixtures'
import { memoryKey } from '~/shared/types/diplomatic-memory'
import {
  M8_2_MEMORY_DECAY_FACTOR_PER_XUN,
  M8_2_MEMORY_EVENT_BASE_WEIGHT,
} from '~/content/m2/balance'
import { diplomaticMemoryPhase } from '../diplomatic-memory-phase'

const player: RealmId = 'realm_player'
const qin: RealmId = 'realm_qin'
const han: RealmId = 'realm_han'

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

function baseRealms(): Map<RealmId, Realm> {
  return new Map([
    [player, makeRealm(player)],
    [qin, makeRealm(qin)],
    [han, makeRealm(han)],
  ])
}

function runPhase(world: World, ticks: number): World {
  let current = world
  for (let i = 0; i < ticks; i++) {
    const result = diplomaticMemoryPhase(current, current.rngState)
    current = { ...result.world, tick: current.tick + 1, rngState: result.nextRng }
  }
  return current
}

describe('diplomaticMemoryPhase decay', () => {
  it('decays betrayalScore by 0.99 per xun (100 → 100 * 0.99^10 ≈ 90.44 after 10 ticks)', () => {
    const key = memoryKey(han, qin)
    const initial = makeEmptyWorld({
      realms: baseRealms(),
      playerRealmId: player,
      diplomaticMemory: new Map([
        [
          key,
          {
            observerId: han,
            subjectId: qin,
            betrayalScore: 100,
            events: [],
            lastUpdatedTick: 0,
            lastObservedHistoryIdx: 0,
          },
        ],
      ]),
    })

    const final = runPhase(initial, 10)
    const memory = final.diplomaticMemory.get(key)

    const expected = 100 * M8_2_MEMORY_DECAY_FACTOR_PER_XUN ** 10
    expect(memory).toBeDefined()
    expect(memory!.betrayalScore).toBeCloseTo(expected, 2)
    expect(expected).toBeCloseTo(90.4382, 2)
  })

  it('does not double-count a single betrayal event across multiple phase invocations', () => {
    const key = memoryKey(han, qin)
    const betrayalEvent: DiplomacyEvent = {
      id: 'evt_one_betrayal',
      kind: 'betrayal',
      occurredAt: TEST_WORLD_DATE,
      actorRealmId: qin,
      targetRealmId: han,
      treatyKind: 'alliance',
    }

    const initial = makeEmptyWorld({
      realms: baseRealms(),
      playerRealmId: player,
      diplomacyHistory: [betrayalEvent],
    })

    const final = runPhase(initial, 5)
    const memory = final.diplomaticMemory.get(key)

    expect(memory).toBeDefined()
    expect(memory!.events).toHaveLength(1)
    expect(memory!.events[0]?.kind).toBe('broken_alliance')
    const expected = M8_2_MEMORY_EVENT_BASE_WEIGHT.broken_alliance * M8_2_MEMORY_DECAY_FACTOR_PER_XUN ** 4
    expect(memory!.betrayalScore).toBeCloseTo(expected, 4)
    expect(memory!.lastObservedHistoryIdx).toBe(1)
  })
})
