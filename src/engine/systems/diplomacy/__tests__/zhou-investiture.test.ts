import { describe, expect, it } from 'vitest'
import { DIPLOMACY_ZHOU_INVESTITURE_ACCEPTANCE_MODIFIER } from '~/content/m2/balance'
import type { Army, GameDate, Realm, Site, World, ZhouInvestitureState } from '~/shared/types'
import { applyThirdPartyReactions, relationKey, scoreDiplomacyAcceptance } from '../index'

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

function makeInvestiture(overrides: Partial<ZhouInvestitureState> = {}): ZhouInvestitureState {
  return {
    realmId: qin,
    recognizedTitle: '侯',
    grantedAtTick: 2,
    expiresAtTick: null,
    source: 'zhou',
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
      ['site_wei_1', makeSite('site_wei_1', wei)],
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
    relations: new Map([[relationKey(qin, han), {
      key: relationKey(qin, han),
      realmAId: han,
      realmBId: qin,
      attitude: 30,
      trust: 70,
      updatedAt: DATE,
    }]]),
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
    rngState: { seed: 0, counter: 0 },
    phases: [],
    pendingOrders: [],
    ...overrides,
  }
}

describe('Zhou investiture diplomacy scoring', () => {
  it('adds the configured acceptance modifier for an active recognized title', () => {
    const request = { kind: 'envoy' as const, proposingRealmId: qin, targetRealmId: han }
    const withoutInvestiture = baseWorld()
    const withActiveInvestiture = baseWorld({
      zhouInvestiture: new Map([[qin, makeInvestiture({ recognizedTitle: '王' })]]),
    })
    const withExpiredInvestiture = baseWorld({
      zhouInvestiture: new Map([[qin, makeInvestiture({ recognizedTitle: '王', expiresAtTick: 4 })]]),
    })

    expect(scoreDiplomacyAcceptance(withActiveInvestiture, request)).toBeCloseTo(
      scoreDiplomacyAcceptance(withoutInvestiture, request) + DIPLOMACY_ZHOU_INVESTITURE_ACCEPTANCE_MODIFIER,
    )
    expect(scoreDiplomacyAcceptance(withExpiredInvestiture, request)).toBeCloseTo(
      scoreDiplomacyAcceptance(withoutInvestiture, request),
    )
  })

  it('applies the configured reaction modifier only while the investiture is active', () => {
    const withoutInvestiture = applyThirdPartyReactions(baseWorld(), {
      kind: 'war_declared',
      actorRealmId: qin,
      targetRealmId: han,
    })
    const withActiveInvestiture = applyThirdPartyReactions(baseWorld({
      zhouInvestiture: new Map([[qin, makeInvestiture({ recognizedTitle: '王' })]]),
    }), {
      kind: 'war_declared',
      actorRealmId: qin,
      targetRealmId: han,
    })
    const withExpiredInvestiture = applyThirdPartyReactions(baseWorld({
      zhouInvestiture: new Map([[qin, makeInvestiture({ recognizedTitle: '王', expiresAtTick: 4 })]]),
    }), {
      kind: 'war_declared',
      actorRealmId: qin,
      targetRealmId: han,
    })

    expect(withoutInvestiture.world.relations.get(relationKey(qin, wei))).toMatchObject({ attitude: -12, trust: 44 })
    expect(withActiveInvestiture.world.relations.get(relationKey(qin, wei))).toMatchObject({ attitude: -22, trust: 34 })
    expect(withExpiredInvestiture.world.relations.get(relationKey(qin, wei))).toMatchObject({ attitude: -12, trust: 44 })
  })

  it('keeps the marker bounded and does not add prestige, legitimacy, or popularMorale fields', () => {
    const investiture = makeInvestiture({ recognizedTitle: '公' })
    const world = baseWorld({ zhouInvestiture: new Map([[qin, investiture]]) })

    expect(Object.keys(investiture).sort()).toEqual([
      'expiresAtTick',
      'grantedAtTick',
      'realmId',
      'recognizedTitle',
      'source',
    ])
    expect('prestige' in investiture).toBe(false)
    expect('legitimacy' in investiture).toBe(false)
    expect('popularMorale' in investiture).toBe(false)
    expect('prestige' in world).toBe(false)
    expect('legitimacy' in world).toBe(false)
    expect('popularMorale' in world).toBe(false)
  })
})
