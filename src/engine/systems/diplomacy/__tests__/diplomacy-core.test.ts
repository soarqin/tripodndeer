import { describe, expect, it } from 'vitest'
import type {
  Army,
  DiplomaticProposal,
  DiplomaticRelation,
  GameDate,
  Realm,
  Site,
  Treaty,
  WarState,
  World,
} from '~/shared/types'
import { warKey } from '~/engine/wars'
import {
  clampAttitude,
  clampRelation,
  clampTrust,
  relationKey,
  scoreDiplomacyAcceptance,
  validateDiplomacyAction,
} from '../index'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const qin = 'realm_qin'
const han = 'realm_han'

function makeRealm(id: string, overrides: Partial<Realm> = {}): Realm {
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
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
    economy: overrides.economy ?? { treasury: 0, foodStores: 0, taxRate: 10 },
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
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
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

function makeWarState(): WarState {
  return {
    casusBelli: null,
    declaredAt: DATE,
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

function makeProposal(overrides: Partial<DiplomaticProposal> = {}): DiplomaticProposal {
  return {
    id: 'proposal_existing',
    kind: 'envoy',
    proposingRealmId: qin,
    targetRealmId: han,
    status: 'pending',
    proposedAt: DATE,
    proposedAtTick: 4,
    expiresAt: DATE,
    expiresAtTick: 13,
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
    expiresAt: null,
    expiresAtTick: null,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: null,
    ...overrides,
  }
}

function makeRelation(overrides: Partial<DiplomaticRelation> = {}): DiplomaticRelation {
  return {
    key: relationKey(qin, han),
    realmAId: han,
    realmBId: qin,
    attitude: 30,
    trust: 70,
    updatedAt: DATE,
    ...overrides,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return {
    date: DATE,
    tick: 4,
    sites: new Map([
      ['site_qin_1', makeSite('site_qin_1', qin)],
      ['site_qin_2', makeSite('site_qin_2', qin)],
      ['site_han_1', makeSite('site_han_1', han)],
    ]),
    realms: new Map([
      [qin, makeRealm(qin)],
      [han, makeRealm(han)],
    ]),
    armies: new Map([
      ['army_qin', makeArmy('army_qin', qin, 5000)],
      ['army_han', makeArmy('army_han', han, 1000)],
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
    rulers: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    playerRealmId: qin,
    rngState: { seed: 0, counter: 0 },
    phases: [],
    pendingOrders: [],
    ...overrides,
  }
}

describe('diplomacy relation helpers', () => {
  it('returns the same canonical relation key regardless of realm order', () => {
    expect(relationKey(qin, han)).toBe(relationKey(han, qin))
    expect(relationKey(qin, han)).toBe('realm_han__realm_qin')
  })

  it('clamps attitude and trust to configured ranges without mutating relation input', () => {
    const relation = makeRelation({ attitude: 999, trust: -40 })

    const clamped = clampRelation(relation)

    expect(clampAttitude(999)).toBe(100)
    expect(clampTrust(-40)).toBe(0)
    expect(clamped.attitude).toBe(100)
    expect(clamped.trust).toBe(0)
    expect(relation.attitude).toBe(999)
    expect(relation.trust).toBe(-40)
  })
})

describe('validateDiplomacyAction', () => {
  it('valid envoy returns proposal metadata with canonical relation key and does not mutate the world', () => {
    const world = baseWorld()
    const originalProposalMap = world.diplomaticProposals
    const originalTreatyMap = world.treaties

    const result = validateDiplomacyAction(world, {
      kind: 'envoy',
      proposingRealmId: qin,
      targetRealmId: han,
      proposalId: 'proposal_envoy_1',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.proposalOrOrder.type).toBe('proposal')
    if (result.proposalOrOrder.type !== 'proposal') return
    expect(result.proposalOrOrder.relationKey).toBe('realm_han__realm_qin')
    expect(result.proposalOrOrder.proposal).toMatchObject({
      id: 'proposal_envoy_1',
      kind: 'envoy',
      proposingRealmId: qin,
      targetRealmId: han,
      status: 'pending',
      proposedAtTick: 4,
      expiresAtTick: 13,
      resolvedAt: null,
      resolvedAtTick: null,
      treatyId: null,
    })
    expect(world.diplomaticProposals).toBe(originalProposalMap)
    expect(world.treaties).toBe(originalTreatyMap)
    expect(world.diplomaticProposals.size).toBe(0)
  })

  it('rejects duplicate pending proposals between the same realms and action', () => {
    const world = baseWorld({
      diplomaticProposals: new Map([['proposal_existing', makeProposal({ proposingRealmId: han, targetRealmId: qin })]]),
    })

    const result = validateDiplomacyAction(world, { kind: 'envoy', proposingRealmId: qin, targetRealmId: han })

    expect(result).toEqual({ ok: false, reason: 'duplicate_proposal' })
  })

  it('rejects alliance and non-aggression with a current enemy', () => {
    const world = baseWorld({ wars: new Map([[warKey(qin, han), makeWarState()]]) })

    expect(validateDiplomacyAction(world, { kind: 'alliance', proposingRealmId: qin, targetRealmId: han }))
      .toEqual({ ok: false, reason: 'current_enemy' })
    expect(validateDiplomacyAction(world, { kind: 'non_aggression', proposingRealmId: qin, targetRealmId: han }))
      .toEqual({ ok: false, reason: 'current_enemy' })
  })

  it('active truce blocks immediate redeclaration', () => {
    const world = baseWorld({ treaties: new Map([['truce_1', makeTreaty({ id: 'truce_1' })]]) })

    const result = validateDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result).toEqual({ ok: false, reason: 'truce_active' })
  })

  it('expired truce does not block declare-war order metadata', () => {
    const world = baseWorld({ treaties: new Map([['truce_1', makeTreaty({ id: 'truce_1', expiresAtTick: 4 })]]) })

    const result = validateDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.proposalOrOrder.type).toBe('order')
    if (result.proposalOrOrder.type !== 'order') return
    expect(result.proposalOrOrder.order).toEqual({ type: 'declare-war', targetRealmId: han })
  })
})

describe('scoreDiplomacyAcceptance', () => {
  it('is deterministic for the same world and request', () => {
    const world = baseWorld()
    const request = { kind: 'non_aggression' as const, proposingRealmId: qin, targetRealmId: han }

    expect(scoreDiplomacyAcceptance(world, request)).toBe(scoreDiplomacyAcceptance(world, request))
  })

  it('uses relation, war, truce, treaty conflicts, threat, and action costs', () => {
    const request = { kind: 'tribute' as const, proposingRealmId: qin, targetRealmId: han }
    const friendly = baseWorld()
    const hostile = baseWorld({
      relations: new Map([[relationKey(qin, han), makeRelation({ attitude: -40, trust: 10 })]]),
      wars: new Map([[warKey(qin, han), makeWarState()]]),
      treaties: new Map([['truce_1', makeTreaty({ id: 'truce_1' })], ['tribute_1', makeTreaty({ id: 'tribute_1', kind: 'tribute' })]]),
    })

    expect(scoreDiplomacyAcceptance(hostile, request)).toBeLessThan(scoreDiplomacyAcceptance(friendly, request))
    expect(scoreDiplomacyAcceptance(friendly, { ...request, kind: 'envoy' })).toBeGreaterThan(
      scoreDiplomacyAcceptance(friendly, { ...request, kind: 'alliance' }),
    )
  })
})
