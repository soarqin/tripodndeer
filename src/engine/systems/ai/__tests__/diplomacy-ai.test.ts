import { describe, expect, it } from 'vitest'
import type {
  CoalitionState,
  DiplomaticProposal,
  DiplomaticRelation,
  Realm,
  RealmId,
  Site,
  Treaty,
  World,
} from '~/shared/types'
import { createInitialRng } from '~/engine/random'
import { diplomacyLifecycleStep, relationKey } from '~/engine/systems/diplomacy'
import { warKey } from '~/engine/wars'
import { aiPlanStep } from '../index'

const DATE = { yearBC: 300, season: 'spring', month: 1, xun: 'shang' } as const

const qin = 'realm_qin'
const han = 'realm_han'
const wei = 'realm_wei'
const zhao = 'realm_zhao'

function makeRealm(id: RealmId, manpowerPool = 1_000): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    stats: { manpowerPool, manpowerCap: manpowerPool, warWeariness: 0 },
  }
}

function makeSite(id: string, ownerId: RealmId): Site {
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

function makeRelation(a: RealmId, b: RealmId, attitude: number, trust: number): DiplomaticRelation {
  const key = relationKey(a, b)
  const [realmAId, realmBId] = key.split('__')
  return {
    key,
    realmAId: realmAId ?? a,
    realmBId: realmBId ?? b,
    attitude,
    trust,
    updatedAt: DATE,
  }
}

function makeProposal(kind: DiplomaticProposal['kind'], proposingRealmId: RealmId, targetRealmId: RealmId): DiplomaticProposal {
  return {
    id: `proposal_${kind}_${relationKey(proposingRealmId, targetRealmId)}`,
    kind,
    proposingRealmId,
    targetRealmId,
    status: 'pending',
    proposedAt: DATE,
    proposedAtTick: 0,
    expiresAt: DATE,
    expiresAtTick: 12,
    resolvedAt: null,
    resolvedAtTick: null,
    treatyId: null,
  }
}

function makeTreaty(kind: Treaty['kind'], a: RealmId, b: RealmId, expiresAtTick: number | null = null): Treaty {
  return {
    id: `treaty_${kind}_${relationKey(a, b)}`,
    kind,
    realmAId: a,
    realmBId: b,
    status: 'active',
    signedAt: DATE,
    signedAtTick: 0,
    expiresAt: expiresAtTick === null ? null : DATE,
    expiresAtTick,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: null,
  }
}

function antiQinCoalition(memberRealmIds: readonly RealmId[] = [han, wei, zhao]): CoalitionState {
  return {
    id: `coalition_against_${qin}`,
    targetRealmId: qin,
    memberRealmIds: [...memberRealmIds].sort((a, b) => a.localeCompare(b)),
    status: 'active',
    formedAt: DATE,
    dissolvedAt: null,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return {
    date: DATE,
    tick: 3,
    sites: new Map([
      [`site_${qin}`, makeSite(`site_${qin}`, qin)],
      [`site_${han}`, makeSite(`site_${han}`, han)],
      [`site_${wei}`, makeSite(`site_${wei}`, wei)],
      [`site_${zhao}`, makeSite(`site_${zhao}`, zhao)],
    ]),
    realms: new Map([
      [qin, makeRealm(qin, 200_000)],
      [han, makeRealm(han)],
      [wei, makeRealm(wei)],
      [zhao, makeRealm(zhao)],
    ]),
    armies: new Map(),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    relations: new Map(),
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
    rngState: createInitialRng(7),
    phases: [],
    pendingOrders: [],
    ...overrides,
  }
}

function serializeDiplomacy(world: World): string {
  return JSON.stringify({
    proposals: [...world.diplomaticProposals.values()].sort((a, b) => a.id.localeCompare(b.id)),
    treaties: [...world.treaties.values()].sort((a, b) => a.id.localeCompare(b.id)),
    wars: [...world.wars.keys()].sort((a, b) => a.localeCompare(b)),
    history: world.diplomacyHistory,
  })
}

describe('deterministic AI diplomacy planner', () => {
  it('replays diplomacy decisions byte-for-byte for a fixed anti-Qin coalition scenario', () => {
    const friendlyHanWei = makeRelation(han, wei, 80, 90)
    const friendlyHanZhao = makeRelation(han, zhao, 75, 85)
    const friendlyWeiZhao = makeRelation(wei, zhao, 70, 80)
    const world = baseWorld({
      relations: new Map([
        [friendlyHanWei.key, friendlyHanWei],
        [friendlyHanZhao.key, friendlyHanZhao],
        [friendlyWeiZhao.key, friendlyWeiZhao],
      ]),
      coalitions: new Map([[`coalition_against_${qin}`, antiQinCoalition()]]),
    })

    const first = aiPlanStep(world, createInitialRng(7))
    const second = aiPlanStep(world, createInitialRng(7))

    expect(serializeDiplomacy(second.world)).toBe(serializeDiplomacy(first.world))
    expect(first.world.diplomaticProposals.size).toBeGreaterThanOrEqual(1)
    expect([...first.world.diplomaticProposals.values()].some(proposal => proposal.kind === 'non_aggression')).toBe(true)
  })

  it('creates no more than one diplomacy proposal per non-player realm per cadence', () => {
    const friendlyHanWei = makeRelation(han, wei, 100, 100)
    const friendlyHanZhao = makeRelation(han, zhao, 100, 100)
    const friendlyWeiZhao = makeRelation(wei, zhao, 100, 100)
    const result = aiPlanStep(baseWorld({
      relations: new Map([
        [friendlyHanWei.key, friendlyHanWei],
        [friendlyHanZhao.key, friendlyHanZhao],
        [friendlyWeiZhao.key, friendlyWeiZhao],
      ]),
      coalitions: new Map([[`coalition_against_${qin}`, antiQinCoalition()]]),
    }), createInitialRng(8))

    const proposalsByRealm = new Map<RealmId, number>()
    for (const proposal of result.world.diplomaticProposals.values()) {
      proposalsByRealm.set(proposal.proposingRealmId, (proposalsByRealm.get(proposal.proposingRealmId) ?? 0) + 1)
    }

    expect([...proposalsByRealm.values()].every(count => count <= 1)).toBe(true)
  })

  it('uses diplomacy lifecycle scoring to accept AI-created proposals', () => {
    const relation = makeRelation(han, wei, 90, 95)
    const planned = aiPlanStep(baseWorld({ relations: new Map([[relation.key, relation]]) }), createInitialRng(9))
    const resolved = diplomacyLifecycleStep(planned.world, planned.nextRng)

    expect(planned.world.diplomaticProposals.size).toBe(1)
    expect(resolved.world.diplomaticProposals.size).toBe(0)
    expect([...resolved.world.treaties.values()].map(treaty => treaty.kind)).toEqual(['non_aggression'])
  })

  it('creates a peace proposal for an AI realm at war through diplomacy validation', () => {
    const relation = makeRelation(han, wei, 90, 95)
    const result = aiPlanStep(baseWorld({
      realms: new Map([
        [qin, makeRealm(qin, 200_000)],
        [han, makeRealm(han)],
        [wei, makeRealm(wei)],
      ]),
      relations: new Map([[relation.key, relation]]),
      wars: new Map([[warKey(han, wei), {
        casusBelli: null,
        declaredAt: DATE,
        occupiedSites: new Map(),
        peaceProposalId: null,
      }]]),
    }), createInitialRng(12))

    expect([...result.world.diplomaticProposals.values()]).toMatchObject([
      { kind: 'peace', proposingRealmId: han, targetRealmId: wei, status: 'pending' },
    ])
  })

  it('respects active truces before coalition or hostile-relation war declarations', () => {
    const hostile = makeRelation(han, qin, -90, 5)
    const truce = makeTreaty('truce', han, qin, 30)
    const result = aiPlanStep(baseWorld({
      relations: new Map([[hostile.key, hostile]]),
      treaties: new Map([[truce.id, truce]]),
      coalitions: new Map([[`coalition_against_${qin}`, antiQinCoalition([han, wei])]]),
    }), createInitialRng(10))

    expect(result.world.wars.has(warKey(han, qin))).toBe(false)
    expect([...result.world.diplomaticProposals.values()].some(proposal => proposal.targetRealmId === qin)).toBe(false)
  })

  it('respects duplicate proposal guards and active treaty conflicts', () => {
    const relation = makeRelation(han, wei, 100, 100)
    const existingProposal = makeProposal('non_aggression', wei, han)
    const treaty = makeTreaty('non_aggression', han, wei)
    const result = aiPlanStep(baseWorld({
      realms: new Map([
        [qin, makeRealm(qin, 200_000)],
        [han, makeRealm(han)],
        [wei, makeRealm(wei)],
      ]),
      relations: new Map([[relation.key, relation]]),
      diplomaticProposals: new Map([[existingProposal.id, existingProposal]]),
      treaties: new Map([[treaty.id, treaty]]),
      coalitions: new Map([[`coalition_against_${qin}`, antiQinCoalition([han, wei])]]),
    }), createInitialRng(11))

    expect([...result.world.diplomaticProposals.values()]).toEqual([existingProposal])
  })
})
