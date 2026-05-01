import { describe, expect, it } from 'vitest'
import { DIPLOMACY_BETRAYAL_TRUST_DELTA, DIPLOMACY_TRUCE_DURATION_TICKS } from '~/content/m2/balance'
import { warKey } from '~/engine/wars'
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
import { applyDiplomacyAction, diplomacyLifecycleStep, relationKey, validateDiplomacyAction } from '../index'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const qin = 'realm_qin'
const han = 'realm_han'
const wei = 'realm_wei'

function makeRealm(id: string, manpowerPool = 1000): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    stats: { manpowerPool, manpowerCap: Math.max(manpowerPool, 5000), warWeariness: 0 },
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

function makeWarState(): WarState {
  return {
    casusBelli: null,
    declaredAt: DATE,
    occupiedSites: new Map(),
    peaceProposalId: null,
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

function makeProposal(overrides: Partial<DiplomaticProposal> = {}): DiplomaticProposal {
  return {
    id: 'proposal_peace',
    kind: 'peace',
    proposingRealmId: qin,
    targetRealmId: han,
    status: 'pending',
    proposedAt: DATE,
    proposedAtTick: 10,
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
    kind: 'alliance',
    realmAId: qin,
    realmBId: han,
    status: 'active',
    signedAt: DATE,
    signedAtTick: 2,
    expiresAt: null,
    expiresAtTick: null,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: null,
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

describe('diplomacy war declaration integration', () => {
  it('declares war through existing war state and cancels only belligerent incompatible treaties', () => {
    const alliance = makeTreaty({ id: 'alliance_qin_han', kind: 'alliance' })
    const nap = makeTreaty({ id: 'nap_qin_han', kind: 'non_aggression' })
    const marriage = makeTreaty({ id: 'marriage_qin_han', kind: 'marriage' })
    const tribute = makeTreaty({ id: 'tribute_qin_han', kind: 'tribute' })
    const thirdPartyAlliance = makeTreaty({ id: 'alliance_qin_wei', kind: 'alliance', realmBId: wei })
    const thirdPartyNap = makeTreaty({ id: 'nap_han_wei', kind: 'non_aggression', realmAId: han, realmBId: wei })
    const world = baseWorld({
      treaties: new Map([
        [alliance.id, alliance],
        [nap.id, nap],
        [marriage.id, marriage],
        [tribute.id, tribute],
        [thirdPartyAlliance.id, thirdPartyAlliance],
        [thirdPartyNap.id, thirdPartyNap],
      ]),
    })

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result.ok).toBe(true)
    expect(result.world.wars.has(warKey(qin, han))).toBe(true)
    expect(result.world.wars.get(warKey(qin, han))?.declaredAt).toEqual(DATE)
    expect(world.wars.size).toBe(0)
    expect(['alliance_qin_han', 'nap_qin_han', 'marriage_qin_han', 'tribute_qin_han'].map(id => result.world.treaties.get(id)?.status))
      .toEqual(['cancelled', 'cancelled', 'cancelled', 'cancelled'])
    expect(result.world.treaties.get('alliance_qin_wei')).toMatchObject({ status: 'active', endedAtTick: null })
    expect(result.world.treaties.get('nap_han_wei')).toMatchObject({ status: 'active', endedAtTick: null })
    expect(result.world.diplomacyHistory.map(event => event.kind)).toEqual([
      'war_declared',
      'treaty_ended',
      'treaty_ended',
      'treaty_ended',
      'treaty_ended',
      'betrayal',
      'relation_changed',
      'relation_changed',
      'relation_changed',
    ])
  })

  it('records betrayal reason and clamps trust when declaring war through a positive treaty', () => {
    const alliance = makeTreaty({ id: 'alliance_qin_han', kind: 'alliance' })
    const world = baseWorld({
      relations: new Map([[relationKey(qin, han), makeRelation({ trust: 20 })]]),
      treaties: new Map([[alliance.id, alliance]]),
    })

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result.ok).toBe(true)
    expect(result.world.treaties.get(alliance.id)).toMatchObject({ status: 'cancelled', endedAtTick: 10 })
    expect(result.world.relations.get(relationKey(qin, han))).toMatchObject({
      trust: Math.max(0, 20 + DIPLOMACY_BETRAYAL_TRUST_DELTA),
      updatedAt: DATE,
    })
    expect(result.world.diplomacyHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'betrayal',
        reason: 'war_declaration_against_treaty',
        actorRealmId: qin,
        targetRealmId: han,
        treatyId: alliance.id,
        relationKey: relationKey(qin, han),
      }),
    ]))
  })

  it('keeps active truce as truce_active without betrayal or treaty cancellation', () => {
    const truce = makeTreaty({ id: 'truce_qin_han', kind: 'truce', expiresAtTick: 20 })
    const world = baseWorld({ treaties: new Map([[truce.id, truce]]) })

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result).toEqual({ ok: false, world, reason: 'truce_active', events: [] })
    expect(result.world.treaties.get(truce.id)).toEqual(truce)
    expect(result.world.diplomacyHistory).toEqual([])
  })
})

describe('diplomacy peace integration', () => {
  it('accepted peace ends the war, creates an active truce, and blocks redeclaration', () => {
    const proposal = makeProposal()
    const world = baseWorld({
      wars: new Map([[warKey(qin, han), makeWarState()]]),
      diplomaticProposals: new Map([[proposal.id, proposal]]),
    })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.world.wars.has(warKey(qin, han))).toBe(false)
    const truce = [...result.world.treaties.values()][0]
    expect(truce).toMatchObject({
      kind: 'truce',
      status: 'active',
      realmAId: qin,
      realmBId: han,
      signedAtTick: 10,
      expiresAtTick: 10 + DIPLOMACY_TRUCE_DURATION_TICKS,
      sourceProposalId: proposal.id,
    })
    expect(validateDiplomacyAction(result.world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han }))
      .toEqual({ ok: false, reason: 'truce_active' })
    expect(result.world.diplomacyHistory.map(event => event.kind)).toEqual(['proposal_resolved', 'treaty_created'])
  })

  it('accepted peace refreshes an existing active truce expiry instead of adding a duplicate', () => {
    const proposal = makeProposal({ id: 'proposal_peace_refresh' })
    const staleTruce = makeTreaty({
      id: 'truce_existing',
      kind: 'truce',
      signedAtTick: 1,
      expiresAtTick: 12,
    })
    const world = baseWorld({
      realms: new Map([
        [qin, makeRealm(qin, 1_000_000)],
        [han, makeRealm(han, 0)],
        [wei, makeRealm(wei)],
      ]),
      wars: new Map([[warKey(qin, han), makeWarState()]]),
      diplomaticProposals: new Map([[proposal.id, proposal]]),
      treaties: new Map([[staleTruce.id, staleTruce]]),
    })

    const result = diplomacyLifecycleStep(world, world.rngState)

    expect(result.world.wars.has(warKey(qin, han))).toBe(false)
    expect(result.world.treaties.size).toBe(1)
    expect(result.world.treaties.get('truce_existing')).toMatchObject({
      status: 'active',
      signedAtTick: 10,
      expiresAtTick: 10 + DIPLOMACY_TRUCE_DURATION_TICKS,
      endedAtTick: null,
      sourceProposalId: proposal.id,
    })
  })
})
