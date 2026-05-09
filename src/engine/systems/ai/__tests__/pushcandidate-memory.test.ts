import { describe, expect, it } from 'vitest'
import type {
  DiplomaticMemory,
  DiplomaticRelation,
  MemoryKey,
  Realm,
  RealmId,
  World,
} from '~/shared/types'
import { memoryKey } from '~/shared/types'
import { createInitialRng } from '~/engine/random'
import { relationKey, scoreDiplomacyAcceptance } from '~/engine/systems/diplomacy'
import { planDiplomacyAction } from '~/engine/systems/ai/internal/diplomacy'
import {
  M8_2_MEMORY_PUSHCANDIDATE_WEIGHT,
  M8_ALLIANCE_PROPENSITY,
} from '~/content/m2/balance'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'

const DATE = { yearBC: 300, season: 'spring', month: 1, xun: 'shang' } as const

const qin = 'realm_qin'
const han = 'realm_han'
const wei = 'realm_wei'

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    stats: { manpowerPool: 0, manpowerCap: 0, warWeariness: 0 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeRelation(a: RealmId, b: RealmId, attitude: number, trust: number): DiplomaticRelation {
  const key = relationKey(a, b)
  const [aId, bId] = key.split('__')
  return {
    key,
    realmAId: aId ?? a,
    realmBId: bId ?? b,
    attitude,
    trust,
    updatedAt: DATE,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  const qinHan = makeRelation(qin, han, 85, 85)
  const qinWei = makeRelation(qin, wei, 85, 85)
  return makeEmptyWorld({
    date: DATE,
    realms: new Map([
      [qin, makeRealm(qin)],
      [han, makeRealm(han)],
      [wei, makeRealm(wei)],
    ]),
    relations: new Map([
      [qinHan.key, qinHan],
      [qinWei.key, qinWei],
    ]),
    playerRealmId: 'realm_dummy_player',
    rngState: createInitialRng(7),
    ...overrides,
  })
}

function memoryEntry(observer: RealmId, subject: RealmId, betrayalScore: number): DiplomaticMemory {
  return {
    observerId: observer,
    subjectId: subject,
    betrayalScore,
    events: [],
    lastUpdatedTick: 0,
    lastObservedHistoryIdx: 0,
  }
}

describe('pushCandidate consumes diplomaticMemory.betrayalScore', () => {
  it('with no memory, qin proposes against the alphabetically-first target (baseline)', () => {
    const world = baseWorld()
    const qinRealm = world.realms.get(qin)
    expect(qinRealm).toBeDefined()
    if (!qinRealm) return

    const result = planDiplomacyAction(world, qinRealm)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const proposals = [...result.world.diplomaticProposals.values()]
    expect(proposals).toHaveLength(1)
    expect(proposals[0]?.proposingRealmId).toBe(qin)
    expect(proposals[0]?.targetRealmId).toBe(han)
  })

  it('with high betrayalScore=80 in target memory, target switches and the implied reduction exceeds 30%', () => {
    const world = baseWorld({
      diplomaticMemory: new Map<MemoryKey, DiplomaticMemory>([
        [memoryKey(han, qin), memoryEntry(han, qin, 80)],
      ]),
    })
    const qinRealm = world.realms.get(qin)
    expect(qinRealm).toBeDefined()
    if (!qinRealm) return

    const result = planDiplomacyAction(world, qinRealm)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const proposals = [...result.world.diplomaticProposals.values()]
    expect(proposals).toHaveLength(1)
    expect(proposals[0]?.targetRealmId).toBe(wei)

    const baselineAcceptance = scoreDiplomacyAcceptance(
      baseWorld(),
      { kind: 'non_aggression', proposingRealmId: qin, targetRealmId: han },
      'steward',
    )
    const baselineCandidateScore = baselineAcceptance * (1 + M8_ALLIANCE_PROPENSITY.steward)
    const penalty = 80 * M8_2_MEMORY_PUSHCANDIDATE_WEIGHT
    expect(penalty / baselineCandidateScore).toBeGreaterThanOrEqual(0.3)
  })
})
