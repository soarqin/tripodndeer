import { describe, expect, it } from 'vitest'
import type { Army, DiplomaticRelation, GameDate, Realm, Site, Treaty, World } from '~/shared/types'
import { applyDiplomacyAction, applyThirdPartyReactions, relationKey } from '../index'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const qin = 'realm_qin'
const han = 'realm_han'
const wei = 'realm_wei'
const zhao = 'realm_zhao'
const chu = 'realm_chu'

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
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    stats: { manpowerPool: 1000, manpowerCap: 5000, warWeariness: 0 },
  }
}

function makeSite(id: string, ownerId: string | null): Site {
  return { id, name: id, position: [0, 0], boundary: [], ownerId, polygon: [], adjacency: [], economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 } }
}

function makeArmy(id: string, realmId: string): Army {
  return {
    id,
    realmId,
    manpower: 1000,
    location: `${realmId}_capital`,
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
  }
}

function makeRelation(a: string, b: string, attitude: number, trust: number): DiplomaticRelation {
  const realmAId = a.localeCompare(b) <= 0 ? a : b
  const realmBId = realmAId === a ? b : a
  return { key: relationKey(a, b), realmAId, realmBId, attitude, trust, updatedAt: DATE }
}

function makeTreaty(overrides: Partial<Treaty> = {}): Treaty {
  return {
    id: 'alliance_qin_han',
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
    tick: 8,
    sites: new Map([
      ['site_qin', makeSite('site_qin', qin)],
      ['site_han', makeSite('site_han', han)],
      ['site_wei', makeSite('site_wei', wei)],
      ['site_zhao', makeSite('site_zhao', zhao)],
    ]),
    realms: new Map([
      [han, makeRealm(han)],
      [qin, makeRealm(qin)],
      [wei, makeRealm(wei)],
      [zhao, makeRealm(zhao)],
    ]),
    armies: new Map([
      ['army_qin', makeArmy('army_qin', qin)],
      ['army_han', makeArmy('army_han', han)],
      ['army_wei', makeArmy('army_wei', wei)],
      ['army_zhao', makeArmy('army_zhao', zhao)],
    ]),
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
    edicts: new Map(),
    governorAssignments: new Map(),
    playerRealmId: qin,
    rngState: { seed: 42, counter: 0 },
    phases: [],
    pendingOrders: [],
    ...overrides,
  }
}

describe('third-party diplomacy reactions', () => {
  it('applies deterministic clamped relation deltas to uninvolved active realms on war declaration', () => {
    const world = baseWorld({
      relations: new Map([
        [relationKey(qin, wei), makeRelation(qin, wei, -95, 3)],
        [relationKey(han, wei), makeRelation(han, wei, 98, 99)],
      ]),
    })

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result.ok).toBe(true)
    expect(result.world.relations.get(relationKey(qin, wei))).toMatchObject({ attitude: -100, trust: 0 })
    expect(result.world.relations.get(relationKey(han, wei))).toMatchObject({ attitude: 100, trust: 100 })
    expect(result.world.diplomacyHistory.map(event => [event.kind, event.relationKey ?? null])).toEqual([
      ['war_declared', relationKey(qin, han)],
      ['relation_changed', relationKey(qin, wei)],
      ['relation_changed', relationKey(han, wei)],
      ['relation_changed', relationKey(qin, zhao)],
      ['relation_changed', relationKey(han, zhao)],
    ])
  })

  it('does not apply reaction deltas to realms absent from world.realms', () => {
    const eliminatedRelation = makeRelation(qin, chu, 10, 60)
    const world = baseWorld({
      realms: new Map([
        [han, makeRealm(han)],
        [qin, makeRealm(qin)],
        [wei, makeRealm(wei)],
      ]),
      relations: new Map([[eliminatedRelation.key, eliminatedRelation]]),
    })

    const result = applyThirdPartyReactions(world, { kind: 'war_declared', actorRealmId: qin, targetRealmId: han })

    expect(result.world.relations.get(eliminatedRelation.key)).toEqual(eliminatedRelation)
    expect(result.world.diplomacyHistory.every(event => event.targetRealmId !== chu && event.actorRealmId !== chu)).toBe(true)
  })

  it('keeps betrayal observable before existing third-party reactions run', () => {
    const treaty = makeTreaty()
    const world = baseWorld({ treaties: new Map([[treaty.id, treaty]]) })

    const result = applyDiplomacyAction(world, { kind: 'declare_war', proposingRealmId: qin, targetRealmId: han })

    expect(result.ok).toBe(true)
    expect(result.world.diplomacyHistory.map(event => [event.kind, event.relationKey ?? null])).toEqual([
      ['war_declared', relationKey(qin, han)],
      ['treaty_ended', relationKey(qin, han)],
      ['betrayal', relationKey(qin, han)],
      ['relation_changed', relationKey(qin, han)],
      ['relation_changed', relationKey(qin, wei)],
      ['relation_changed', relationKey(han, wei)],
      ['relation_changed', relationKey(qin, zhao)],
      ['relation_changed', relationKey(han, zhao)],
    ])
  })
})
