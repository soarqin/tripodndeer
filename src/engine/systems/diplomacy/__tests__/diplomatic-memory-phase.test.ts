import { describe, expect, it } from 'vitest'
import type { DiplomacyEvent, DiplomaticMemory, Realm, World } from '~/shared/types'
import { makeEmptyWorld, TEST_WORLD_DATE } from '~/shared/__tests__/fixtures'
import { memoryKey } from '~/shared/types/diplomatic-memory'
import {
  M8_2_MEMORY_DECAY_FACTOR_PER_XUN,
  M8_2_MEMORY_EVENT_BASE_WEIGHT,
  M8_2_MEMORY_MAX_SCORE,
} from '~/content/m2/balance'
import { diplomaticMemoryPhase } from '../diplomatic-memory-phase'

const qin = 'realm_qin'
const han = 'realm_han'
const wei = 'realm_wei'
const player = 'realm_player'

function makeRealm(id: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    stats: { manpowerPool: 1000, manpowerCap: 5000, warWeariness: 0 },
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    tick: 8,
    realms: new Map([
      [qin, makeRealm(qin)],
      [han, makeRealm(han)],
      [wei, makeRealm(wei)],
      [player, makeRealm(player)],
    ]),
    playerRealmId: player,
    ...overrides,
  })
}

function event(overrides: Partial<DiplomacyEvent>): DiplomacyEvent {
  return {
    id: `event_${overrides.kind ?? 'betrayal'}_${overrides.actorRealmId ?? qin}_${overrides.targetRealmId ?? han}`,
    kind: 'betrayal',
    occurredAt: TEST_WORLD_DATE,
    actorRealmId: qin,
    targetRealmId: han,
    ...overrides,
  }
}

function memory(overrides: Partial<DiplomaticMemory>): DiplomaticMemory {
  return {
    observerId: han,
    subjectId: qin,
    betrayalScore: 0,
    events: [],
    lastUpdatedTick: 3,
    lastObservedHistoryIdx: 0,
    ...overrides,
  }
}

describe('diplomaticMemoryPhase', () => {
  it('records betrayal of an alliance as broken_alliance memory', () => {
    const world = baseWorld({
      diplomacyHistory: [event({ kind: 'betrayal', treatyKind: 'alliance' })],
    })

    const result = diplomaticMemoryPhase(world, world.rngState)
    const recorded = result.world.diplomaticMemory.get(memoryKey(han, qin))

    expect(recorded?.betrayalScore).toBe(M8_2_MEMORY_EVENT_BASE_WEIGHT.broken_alliance)
    expect(recorded?.events).toEqual([
      { kind: 'broken_alliance', tick: world.tick, weight: M8_2_MEMORY_EVENT_BASE_WEIGHT.broken_alliance },
    ])
    expect(recorded?.lastObservedHistoryIdx).toBe(1)
  })

  it('does not create memories for the player realm as observer', () => {
    const world = baseWorld({
      diplomacyHistory: [event({ actorRealmId: han, targetRealmId: player, treatyKind: 'alliance' })],
    })

    const result = diplomaticMemoryPhase(world, world.rngState)

    expect(result.world.diplomaticMemory.has(memoryKey(player, han))).toBe(false)
  })

  it('uses lastObservedHistoryIdx to avoid double-counting events', () => {
    const world = baseWorld({
      diplomacyHistory: [event({ kind: 'betrayal', treatyKind: 'alliance' })],
    })

    const first = diplomaticMemoryPhase(world, world.rngState)
    const second = diplomaticMemoryPhase(first.world, first.nextRng)
    const recorded = second.world.diplomaticMemory.get(memoryKey(han, qin))

    expect(recorded?.events).toHaveLength(1)
    expect(recorded?.betrayalScore).toBe(
      M8_2_MEMORY_EVENT_BASE_WEIGHT.broken_alliance * M8_2_MEMORY_DECAY_FACTOR_PER_XUN,
    )
    expect(recorded?.lastObservedHistoryIdx).toBe(1)
  })

  it('scans only diplomacyHistory after lastObservedHistoryIdx', () => {
    const key = memoryKey(han, qin)
    const world = baseWorld({
      diplomacyHistory: [
        event({ kind: 'betrayal', treatyKind: 'alliance' }),
        event({ kind: 'war_declared', unprovoked: true }),
      ],
      diplomaticMemory: new Map([[key, memory({ lastObservedHistoryIdx: 1 })]]),
    })

    const result = diplomaticMemoryPhase(world, world.rngState)
    const recorded = result.world.diplomaticMemory.get(key)

    expect(recorded?.events.map((ev) => ev.kind)).toEqual(['unprovoked_war'])
    expect(recorded?.betrayalScore).toBe(M8_2_MEMORY_EVENT_BASE_WEIGHT.unprovoked_war)
    expect(recorded?.lastObservedHistoryIdx).toBe(2)
  })

  it('prunes entries whose decayed score falls below the minimum threshold', () => {
    const key = memoryKey(han, qin)
    const world = baseWorld({
      diplomaticMemory: new Map([[key, memory({ betrayalScore: 0.5 })]]),
    })

    const result = diplomaticMemoryPhase(world, world.rngState)

    expect(result.world.diplomaticMemory.has(key)).toBe(false)
  })

  it('keeps the ring buffer capped at 10 events', () => {
    const history = Array.from({ length: 12 }, (_, index) =>
      event({ id: `betrayal_${index}`, kind: 'betrayal', treatyKind: 'alliance' }),
    )
    const world = baseWorld({ diplomacyHistory: history })

    const result = diplomaticMemoryPhase(world, world.rngState)
    const recorded = result.world.diplomaticMemory.get(memoryKey(han, qin))

    expect(recorded?.events).toHaveLength(10)
    expect(recorded?.betrayalScore).toBe(M8_2_MEMORY_MAX_SCORE)
  })

  it('maps small border combat observations to border_skirmish', () => {
    const world = baseWorld({
      diplomacyHistory: [
        event({
          kind: 'combat_observed',
          combatPayload: { armySizeTotal: 500, borderSite: true, victorRealmId: qin },
        }),
      ],
    })

    const result = diplomaticMemoryPhase(world, world.rngState)
    const recorded = result.world.diplomaticMemory.get(memoryKey(han, qin))

    expect(recorded?.events[0]?.kind).toBe('border_skirmish')
    expect(recorded?.betrayalScore).toBe(M8_2_MEMORY_EVENT_BASE_WEIGHT.border_skirmish)
  })

  it('maps other combat observations to battlefield_victory', () => {
    const world = baseWorld({
      diplomacyHistory: [
        event({
          kind: 'combat_observed',
          combatPayload: { armySizeTotal: 5000, borderSite: true, victorRealmId: qin },
        }),
      ],
    })

    const result = diplomaticMemoryPhase(world, world.rngState)
    const recorded = result.world.diplomaticMemory.get(memoryKey(han, qin))

    expect(recorded?.events[0]?.kind).toBe('battlefield_victory')
    expect(recorded?.betrayalScore).toBe(M8_2_MEMORY_EVENT_BASE_WEIGHT.battlefield_victory)
  })

  it('maps spy_caught diplomacy events to spy_caught memory', () => {
    const world = baseWorld({
      diplomacyHistory: [event({ kind: 'spy_caught', spyMissionId: 'spy_1' })],
    })

    const result = diplomaticMemoryPhase(world, world.rngState)
    const recorded = result.world.diplomaticMemory.get(memoryKey(han, qin))

    expect(recorded?.events[0]?.kind).toBe('spy_caught')
    expect(recorded?.betrayalScore).toBe(M8_2_MEMORY_EVENT_BASE_WEIGHT.spy_caught)
  })

  it('maps broken truce treaty_ended events to broken_peace', () => {
    const world = baseWorld({
      diplomacyHistory: [
        event({ kind: 'treaty_ended', treatyKind: 'truce', reason: 'war_declaration_against_treaty' }),
      ],
    })

    const result = diplomaticMemoryPhase(world, world.rngState)
    const recorded = result.world.diplomaticMemory.get(memoryKey(han, qin))

    expect(recorded?.events[0]?.kind).toBe('broken_peace')
    expect(recorded?.betrayalScore).toBe(M8_2_MEMORY_EVENT_BASE_WEIGHT.broken_peace)
  })

  it('does not consume RNG', () => {
    const rng = { seed: 42, counter: 7 }
    const world = baseWorld({ rngState: rng, diplomacyHistory: [event({ kind: 'spy_caught' })] })

    const result = diplomaticMemoryPhase(world, rng)

    expect(result.nextRng).toBe(rng)
  })

  it('returns a new diplomaticMemory map without mutating the original', () => {
    const originalMemory = new Map([[memoryKey(han, qin), memory({ betrayalScore: 10 })]])
    const world = baseWorld({
      diplomaticMemory: originalMemory,
      diplomacyHistory: [event({ kind: 'war_declared', unprovoked: true })],
    })

    const result = diplomaticMemoryPhase(world, world.rngState)

    expect(result.world.diplomaticMemory).not.toBe(originalMemory)
    expect(originalMemory.get(memoryKey(han, qin))?.betrayalScore).toBe(10)
    expect(result.world.diplomaticMemory.get(memoryKey(han, qin))?.betrayalScore).toBe(
      10 * M8_2_MEMORY_DECAY_FACTOR_PER_XUN + M8_2_MEMORY_EVENT_BASE_WEIGHT.unprovoked_war,
    )
  })
})
