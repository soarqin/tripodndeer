import { describe, expect, it } from 'vitest'
import {
  DIPLOMACY_NON_AGGRESSION_DURATION_TICKS,
  DIPLOMACY_RELATION_DRIFT_INTERVAL_TICKS,
  DIPLOMACY_RELATION_NEUTRAL_ATTITUDE,
  DIPLOMACY_RELATION_NEUTRAL_TRUST,
  DIPLOMACY_TRUCE_DURATION_TICKS,
} from '~/content/m2/balance'
import type {
  Army,
  DiplomaticProposal,
  DiplomaticRelation,
  GameDate,
  Realm,
  Site,
  Treaty,
  World,
} from '~/shared/types'
import { relationKey } from '../diplomacy-core'
import { diplomacyLifecycleStep } from '../lifecycle'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const qin = 'realm_qin'
const han = 'realm_han'
const wei = 'realm_wei'

function makeRealm(id: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    stats: { manpowerPool: 1000, manpowerCap: 5000, warWeariness: 0 },
  }
}

function makeSite(id: string, ownerId: string | null): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
  }
}

function makeArmy(id: string, realmId: string, manpower: number): Army {
  return {
    id,
    realmId,
    manpower,
    location: `${realmId}_capital`,
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
  }
}

function makeProposal(overrides: Partial<DiplomaticProposal> = {}): DiplomaticProposal {
  return {
    id: 'proposal_non_aggression',
    kind: 'non_aggression',
    proposingRealmId: qin,
    targetRealmId: han,
    status: 'pending',
    proposedAt: DATE,
    proposedAtTick: 4,
    expiresAt: DATE,
    expiresAtTick: 20,
    resolvedAt: null,
    resolvedAtTick: null,
    treatyId: null,
    ...overrides,
  }
}

function makeTreaty(overrides: Partial<Treaty> = {}): Treaty {
  return {
    id: 'treaty_1',
    kind: 'truce',
    realmAId: qin,
    realmBId: han,
    status: 'active',
    signedAt: DATE,
    signedAtTick: 1,
    expiresAt: DATE,
    expiresAtTick: 10,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: null,
    ...overrides,
  }
}

function makeRelation(overrides: Partial<DiplomaticRelation> = {}): DiplomaticRelation {
  return {
    key: relationKey(qin, han),
    realmAId: qin,
    realmBId: han,
    attitude: 100,
    trust: 100,
    updatedAt: DATE,
    ...overrides,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return {
    date: DATE,
    tick: 10,
    sites: new Map([
      ['site_qin', makeSite('site_qin', qin)],
      ['site_han', makeSite('site_han', han)],
      ['site_wei', makeSite('site_wei', wei)],
    ]),
    realms: new Map([
      [qin, makeRealm(qin)],
      [han, makeRealm(han)],
      [wei, makeRealm(wei)],
    ]),
    armies: new Map([
      ['army_qin', makeArmy('army_qin', qin, 5000)],
      ['army_han', makeArmy('army_han', han, 1000)],
      ['army_wei', makeArmy('army_wei', wei, 1000)],
    ]),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    relations: new Map([[relationKey(qin, han), makeRelation()]]),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
    generals: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    playerRealmId: qin,
    rngState: { seed: 42, counter: 0 },
    phases: [],
    pendingOrders: [],
    ...overrides,
  }
}

describe('diplomacyLifecycleStep proposals', () => {
  it('accepts a proposal into exactly one treaty and history without mutating the original world', () => {
    const proposal = makeProposal()
    const world = baseWorld({ diplomaticProposals: new Map([[proposal.id, proposal]]) })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.nextRng).toBe(world.rngState)
    expect(world.diplomaticProposals.size).toBe(1)
    expect(world.treaties.size).toBe(0)
    expect(result.world.diplomaticProposals.size).toBe(0)
    expect(result.world.treaties.size).toBe(1)
    const treaty = [...result.world.treaties.values()][0]
    expect(treaty).toMatchObject({
      kind: 'non_aggression',
      realmAId: qin,
      realmBId: han,
      status: 'active',
      signedAtTick: 10,
      expiresAtTick: 10 + DIPLOMACY_NON_AGGRESSION_DURATION_TICKS,
      sourceProposalId: proposal.id,
    })
    expect(result.world.diplomacyHistory.map(event => event.kind)).toEqual([
      'proposal_resolved',
      'treaty_created',
    ])
    expect(result.events).toHaveLength(2)
  })

  it('expires a proposal on the inclusive exact tick before acceptance scoring', () => {
    const proposal = makeProposal({ expiresAtTick: 10 })
    const world = baseWorld({ diplomaticProposals: new Map([[proposal.id, proposal]]) })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.world.diplomaticProposals.size).toBe(0)
    expect(result.world.treaties.size).toBe(0)
    expect(result.world.diplomacyHistory).toHaveLength(1)
    expect(result.world.diplomacyHistory[0]?.id).toContain('_expired_')
  })

  it('rejects an unaccepted proposal and records history', () => {
    const proposal = makeProposal({ id: 'proposal_rejected', kind: 'alliance' })
    const hostile = makeRelation({ attitude: -100, trust: 0 })
    const world = baseWorld({
      relations: new Map([[hostile.key, hostile]]),
      diplomaticProposals: new Map([[proposal.id, proposal]]),
    })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.world.diplomaticProposals.size).toBe(0)
    expect(result.world.treaties.size).toBe(0)
    expect(result.world.diplomacyHistory[0]?.id).toContain('_rejected_')
  })
})

describe('diplomacyLifecycleStep treaties and realm invalidation', () => {
  it('expires treaty and truce records on exact tick boundary', () => {
    const truce = makeTreaty({ id: 'truce_1', kind: 'truce', expiresAtTick: 10 })
    const pact = makeTreaty({
      id: 'pact_1',
      kind: 'non_aggression',
      realmAId: qin,
      realmBId: wei,
      expiresAtTick: 11,
    })
    const world = baseWorld({ treaties: new Map([[truce.id, truce], [pact.id, pact]]) })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.world.treaties.get('truce_1')).toMatchObject({
      status: 'expired',
      endedAtTick: 10,
    })
    expect(result.world.treaties.get('pact_1')).toMatchObject({ status: 'active', endedAtTick: null })
  })

  it('accepted peace creates a truce with the configured duration', () => {
    const proposal = makeProposal({ id: 'proposal_peace', kind: 'peace' })
    const world = baseWorld({ diplomaticProposals: new Map([[proposal.id, proposal]]) })

    const result = diplomacyLifecycleStep(world, world.rngState)

    const treaty = [...result.world.treaties.values()][0]
    expect(treaty).toMatchObject({
      kind: 'truce',
      expiresAtTick: 10 + DIPLOMACY_TRUCE_DURATION_TICKS,
    })
  })

  it('uses absence from world.realms as realm elimination and invalidates only related diplomacy', () => {
    const relatedProposal = makeProposal({ id: 'proposal_related', targetRealmId: han })
    const unrelatedProposal = makeProposal({ id: 'proposal_unrelated', kind: 'marriage', targetRealmId: wei })
    const relatedTreaty = makeTreaty({ id: 'treaty_related', realmBId: han, expiresAtTick: null })
    const unrelatedTreaty = makeTreaty({
      id: 'treaty_unrelated',
      kind: 'non_aggression',
      realmBId: wei,
      expiresAtTick: null,
    })
    const unrelatedRelation = makeRelation({
      key: relationKey(qin, wei),
      realmAId: qin,
      realmBId: wei,
      attitude: 100,
      trust: 100,
    })
    const world = baseWorld({
      realms: new Map([
        [qin, makeRealm(qin)],
        [wei, makeRealm(wei)],
      ]),
      relations: new Map([
        [relationKey(qin, han), makeRelation()],
        [relationKey(qin, wei), unrelatedRelation],
      ]),
      diplomaticProposals: new Map([
        [relatedProposal.id, relatedProposal],
        [unrelatedProposal.id, unrelatedProposal],
      ]),
      treaties: new Map([
        [relatedTreaty.id, relatedTreaty],
        [unrelatedTreaty.id, unrelatedTreaty],
      ]),
    })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.world.diplomaticProposals.has('proposal_related')).toBe(false)
    expect(result.world.treaties.get('treaty_related')).toMatchObject({ status: 'cancelled', endedAtTick: 10 })
    expect(result.world.treaties.get('treaty_unrelated')).toMatchObject({ status: 'active', endedAtTick: null })
    expect([...result.world.treaties.values()].filter(treaty => treaty.sourceProposalId === 'proposal_unrelated')).toHaveLength(1)
  })
})

describe('diplomacyLifecycleStep relation drift', () => {
  it('does not drift relations off cadence', () => {
    const relation = makeRelation({ attitude: 20, trust: 70 })
    const world = baseWorld({ tick: DIPLOMACY_RELATION_DRIFT_INTERVAL_TICKS + 1, relations: new Map([[relation.key, relation]]) })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.world.relations.get(relation.key)).toEqual(relation)
  })

  it('drifts relations toward configured neutral values on cadence deterministically', () => {
    const relation = makeRelation({ attitude: 20, trust: 40 })
    const world = baseWorld({ tick: DIPLOMACY_RELATION_DRIFT_INTERVAL_TICKS, relations: new Map([[relation.key, relation]]) })

    const first = diplomacyLifecycleStep(world, world.rngState)
    const second = diplomacyLifecycleStep(world, world.rngState)
    const drifted = first.world.relations.get(relation.key)

    expect(drifted?.attitude).toBe(19)
    expect(drifted?.trust).toBe(41)
    expect(Math.abs((drifted?.attitude ?? 0) - DIPLOMACY_RELATION_NEUTRAL_ATTITUDE)).toBeLessThan(
      Math.abs(relation.attitude - DIPLOMACY_RELATION_NEUTRAL_ATTITUDE),
    )
    expect(Math.abs((drifted?.trust ?? 0) - DIPLOMACY_RELATION_NEUTRAL_TRUST)).toBeLessThan(
      Math.abs(relation.trust - DIPLOMACY_RELATION_NEUTRAL_TRUST),
    )
    expect(first.world.relations).toEqual(second.world.relations)
    expect(first.world.diplomacyHistory[0]?.kind).toBe('relation_changed')
  })
})
