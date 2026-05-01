import { describe, expect, it } from 'vitest'
import type {
  GameDate,
  General,
  PeaceProposal,
  PeaceTerm,
  Realm,
  Site,
  WarState,
  World,
} from '~/shared/types'
import { warKey } from '~/engine/wars'
import {
  acceptProposal,
  applyCession,
  applyIndemnity,
  applyTribute,
  createPeaceProposal,
  rejectProposal,
  scoreProposalAcceptance,
} from '../index'
import { applyOrder } from '~/engine/systems/orders'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const proposingRealmId = 'realm_qin'
const targetRealmId = 'realm_han'

function makeRealm(id: string, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: 'site_a',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    ...overrides,
    economy: overrides.economy ?? { treasury: 0, foodStores: 0, taxRate: 10 },
  }
}

function makeSite(id: string, ownerId: string | null, overrides: Partial<Site> = {}): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    ...overrides,
    economy: overrides.economy ?? { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
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

function baseWorld(overrides: Partial<World> = {}): World {
  return {
    date: DATE,
    tick: 0,
    sites: new Map(),
    realms: new Map([
      [proposingRealmId, makeRealm(proposingRealmId)],
      [targetRealmId, makeRealm(targetRealmId)],
    ]),
    armies: new Map(),
    edges: new Map(),
    wars: new Map([[warKey(proposingRealmId, targetRealmId), makeWarState()]]),
    peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
    generals: new Map(),
    rulers: new Map(),
    eventChainStates: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    playerRealmId: proposingRealmId,
    rngState: { seed: 0, counter: 0 },
    phases: [],
    pendingOrders: [],
    ...overrides,
  }
}

describe('createPeaceProposal', () => {
  it('creates a pending proposal and attaches it to the war', () => {
    const world = baseWorld()
    const { world: newWorld, proposalId } = createPeaceProposal(world, {
      id: 'prop_1',
      proposingRealmId,
      targetRealmId,
      terms: [],
      proposedAt: DATE,
    })

    expect(proposalId).toBe('prop_1')
    const proposal = newWorld.peaceProposals.get('prop_1')!
    expect(proposal.status).toBe('pending')
    expect(proposal.acknowledgedAt).toBeNull()

    const warState = newWorld.wars.get(warKey(proposingRealmId, targetRealmId))!
    expect(warState.peaceProposalId).toBe('prop_1')
  })

  it('does not attach when no war exists between the realms', () => {
    const world = baseWorld({ wars: new Map() })
    const { world: newWorld } = createPeaceProposal(world, {
      id: 'prop_1',
      proposingRealmId,
      targetRealmId,
      terms: [],
      proposedAt: DATE,
    })

    expect(newWorld.peaceProposals.get('prop_1')!.status).toBe('pending')
    expect(newWorld.wars.size).toBe(0)
  })
})

describe('applyCession', () => {
  it('transfers ownership of occupied sites to the occupier', () => {
    const occupiedSite = makeSite('site_x', targetRealmId, {
      occupation: { occupierId: proposingRealmId, controlLevel: 50 },
    })
    const world = baseWorld({ sites: new Map([['site_x', occupiedSite]]) })

    const newWorld = applyCession(world, {
      type: 'cession',
      payload: { siteIds: ['site_x'] },
    })

    expect(newWorld.sites.get('site_x')!.ownerId).toBe(proposingRealmId)
  })

  it('leaves owner unchanged when no occupation record', () => {
    const site = makeSite('site_y', targetRealmId)
    const world = baseWorld({ sites: new Map([['site_y', site]]) })

    const newWorld = applyCession(world, {
      type: 'cession',
      payload: { siteIds: ['site_y'] },
    })

    expect(newWorld.sites.get('site_y')!.ownerId).toBe(targetRealmId)
  })
})

describe('applyIndemnity / applyTribute', () => {
  it('applyIndemnity is a record-only no-op on world state', () => {
    const world = baseWorld()
    const result = applyIndemnity(world, {
      type: 'indemnity',
      payload: { amount: 1000 },
    })
    expect(result).toBe(world)
    expect(result.realms).toBe(world.realms)
    expect(result.sites).toBe(world.sites)
    expect(result.armies).toBe(world.armies)
    expect(result.peaceProposals).toBe(world.peaceProposals)
  })

  it('applyTribute is a record-only no-op on world state', () => {
    const world = baseWorld()
    const result = applyTribute(world, {
      type: 'tribute',
      payload: { amountPerYear: 500, years: 3 },
    })
    expect(result).toBe(world)
    expect(result.realms).toBe(world.realms)
    expect(result.sites).toBe(world.sites)
    expect(result.armies).toBe(world.armies)
    expect(result.peaceProposals).toBe(world.peaceProposals)
  })
})

describe('acceptProposal', () => {
  it('marks proposal accepted, applies cession, and keeps indemnity/tribute recorded only', () => {
    const occupiedSite = makeSite('site_x', targetRealmId, {
      occupation: { occupierId: proposingRealmId, controlLevel: 50 },
    })
    let world = baseWorld({ sites: new Map([['site_x', occupiedSite]]) })

    const terms: PeaceTerm[] = [
      { type: 'cession', payload: { siteIds: ['site_x'] } },
      { type: 'indemnity', payload: { amount: 100 } },
      { type: 'tribute', payload: { amountPerYear: 10, years: 3 } },
    ]

    const created = createPeaceProposal(world, {
      id: 'prop_1',
      proposingRealmId,
      targetRealmId,
      terms,
      proposedAt: DATE,
    })
    world = created.world

    const next: GameDate = { yearBC: 259, season: 'summer', month: 2, xun: 'zhong' }
    const accepted = acceptProposal(world, 'prop_1', next)

    const proposal = accepted.peaceProposals.get('prop_1')!
    expect(proposal.status).toBe('accepted')
    expect(proposal.acknowledgedAt).toEqual(next)
    expect(proposal.terms).toEqual(terms)
    expect(accepted.sites.get('site_x')!.ownerId).toBe(proposingRealmId)
    expect(accepted.realms).toBe(world.realms)
    expect(accepted.armies).toBe(world.armies)
    expect(accepted.peaceProposals).not.toBe(world.peaceProposals)
    expect(accepted.sites).not.toBe(world.sites)
    expect(accepted.wars.has(warKey(proposingRealmId, targetRealmId))).toBe(false)
  })

  it('is a no-op when proposal is missing or not pending', () => {
    const world = baseWorld()
    const proposal: PeaceProposal = {
      id: 'prop_1',
      proposingRealmId,
      targetRealmId,
      terms: [],
      proposedAt: DATE,
      status: 'rejected',
      acknowledgedAt: null,
    }
    const peaceProposals = new Map(world.peaceProposals)
    peaceProposals.set('prop_1', proposal)
    const w2 = { ...world, peaceProposals }

    const result = acceptProposal(w2, 'prop_1', DATE)
    expect(result).toBe(w2)
  })
})

describe('rejectProposal', () => {
  it('marks proposal rejected and leaves the war intact', () => {
    let world = baseWorld()
    const created = createPeaceProposal(world, {
      id: 'prop_1',
      proposingRealmId,
      targetRealmId,
      terms: [],
      proposedAt: DATE,
    })
    world = created.world

    const rejected = rejectProposal(world, 'prop_1')

    const proposal = rejected.peaceProposals.get('prop_1')!
    expect(proposal.status).toBe('rejected')
    expect(proposal.acknowledgedAt).toBeNull()
    expect(rejected.wars.has(warKey(proposingRealmId, targetRealmId))).toBe(true)
  })
})

describe('scoreProposalAcceptance', () => {
  function makeGeneral(id: string, realmId: string): General {
    return { id, realmId, name: id, might: 5, command: 1000, loyalty: 80 }
  }

  it('higher score when many sites of target are occupied by proposer', () => {
    const sites = new Map<string, Site>()
    for (let i = 0; i < 3; i++) {
      sites.set(
        `site_${i}`,
        makeSite(`site_${i}`, targetRealmId, {
          occupation: { occupierId: proposingRealmId, controlLevel: 50 },
        }),
      )
    }
    const world = baseWorld({ sites })

    const proposal: PeaceProposal = {
      id: 'p',
      proposingRealmId,
      targetRealmId,
      terms: [],
      proposedAt: DATE,
      status: 'pending',
      acknowledgedAt: null,
    }

    // 3 occupied sites * 30 = 90. > 50 → accept threshold met.
    expect(scoreProposalAcceptance(world, proposal)).toBeGreaterThan(50)
  })

  it('low / negative score when target is undamaged and has many generals', () => {
    const generals = new Map<string, General>([
      ['g1', makeGeneral('g1', targetRealmId)],
      ['g2', makeGeneral('g2', targetRealmId)],
      ['g3', makeGeneral('g3', targetRealmId)],
    ])
    const world = baseWorld({ generals })

    const proposal: PeaceProposal = {
      id: 'p',
      proposingRealmId,
      targetRealmId,
      terms: [],
      proposedAt: DATE,
      status: 'pending',
      acknowledgedAt: null,
    }

    // 0 occupied + 0 weariness - 3 generals * 5 = -15. < 50.
    expect(scoreProposalAcceptance(world, proposal)).toBeLessThan(50)
  })

  it('factors war weariness into the score', () => {
    const world = baseWorld({
      realms: new Map([
        [proposingRealmId, makeRealm(proposingRealmId)],
        [
          targetRealmId,
          makeRealm(targetRealmId, {
            stats: { manpowerPool: 0, manpowerCap: 5000, warWeariness: 100 },
          }),
        ],
      ]),
    })

    const proposal: PeaceProposal = {
      id: 'p',
      proposingRealmId,
      targetRealmId,
      terms: [],
      proposedAt: DATE,
      status: 'pending',
      acknowledgedAt: null,
    }

    // 0 + 100 * 0.5 - 0 = 50
    expect(scoreProposalAcceptance(world, proposal)).toBeCloseTo(50, 5)
  })
})

describe('applyOrder propose-peace integration', () => {
  it('creates a peace proposal via the order pipeline and emits peaceProposed', () => {
    const world = baseWorld()

    const { world: newWorld, events } = applyOrder(world, {
      type: 'propose-peace',
      peaceProposalData: {
        proposalId: 'prop_42',
        proposingRealmId,
        targetRealmId,
        terms: [{ type: 'indemnity', payload: { amount: 1000 } }],
      },
    })

    expect(newWorld.peaceProposals.get('prop_42')!.status).toBe('pending')
    expect(events.map(e => e.type)).toContain('peaceProposed')
  })
})
