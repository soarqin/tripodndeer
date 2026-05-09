import { describe, expect, it } from 'vitest'
import type {
  GameDate,
  PeaceProposal,
  Realm,
  Treaty,
  World,
} from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { getActiveTributeRelationships } from '../tribute-query'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }

function makeRealm(id: string): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: 'site_a',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeTreaty(overrides: Partial<Treaty> = {}): Treaty {
  return {
    id: 'treaty_default',
    kind: 'tribute',
    realmAId: 'realm_han',
    realmBId: 'realm_qin',
    status: 'active',
    signedAt: DATE,
    signedAtTick: 10,
    expiresAt: null,
    expiresAtTick: null,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: null,
    ...overrides,
  }
}

function makePeaceProposal(overrides: Partial<PeaceProposal> = {}): PeaceProposal {
  return {
    id: 'prop_default',
    proposingRealmId: 'realm_qin',
    targetRealmId: 'realm_han',
    terms: [{ type: 'tribute', payload: { amountPerYear: 100, years: 5 } }],
    proposedAt: DATE,
    status: 'accepted',
    acknowledgedAt: DATE,
    ...overrides,
  }
}

function baseWorld(overrides: Partial<World> = {}): World {
  return makeEmptyWorld({
    date: DATE,
    realms: new Map([
      ['realm_qin', makeRealm('realm_qin')],
      ['realm_han', makeRealm('realm_han')],
      ['realm_chu', makeRealm('realm_chu')],
    ]),
    playerRealmId: 'realm_qin',
    ...overrides,
  })
}

describe('getActiveTributeRelationships', () => {
  it('returns empty array when world has no tribute treaties or peace tributes', () => {
    const world = baseWorld()
    expect(getActiveTributeRelationships(world)).toEqual([])
  })

  it('returns single relationship for one active tribute treaty', () => {
    const treaty = makeTreaty({ id: 'treaty_t1', signedAtTick: 42 })
    const world = baseWorld({ treaties: new Map([[treaty.id, treaty]]) })

    const result = getActiveTributeRelationships(world)
    expect(result).toEqual([
      { tributaryRealmId: 'realm_han', suzerainRealmId: 'realm_qin', activeSinceTick: 42 },
    ])
  })

  it('returns all active tribute treaties when multiple exist', () => {
    const treaties = new Map([
      ['treaty_t1', makeTreaty({ id: 'treaty_t1', realmAId: 'realm_han', realmBId: 'realm_qin', signedAtTick: 5 })],
      ['treaty_t2', makeTreaty({ id: 'treaty_t2', realmAId: 'realm_chu', realmBId: 'realm_qin', signedAtTick: 8 })],
    ])
    const world = baseWorld({ treaties })

    const result = getActiveTributeRelationships(world)
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({
      tributaryRealmId: 'realm_chu',
      suzerainRealmId: 'realm_qin',
      activeSinceTick: 8,
    })
    expect(result).toContainEqual({
      tributaryRealmId: 'realm_han',
      suzerainRealmId: 'realm_qin',
      activeSinceTick: 5,
    })
  })

  it('excludes treaties that are not kind=tribute', () => {
    const tribute = makeTreaty({ id: 'treaty_t1', kind: 'tribute' })
    const alliance = makeTreaty({ id: 'treaty_t2', kind: 'alliance' })
    const truce = makeTreaty({ id: 'treaty_t3', kind: 'truce' })
    const world = baseWorld({
      treaties: new Map([
        [tribute.id, tribute],
        [alliance.id, alliance],
        [truce.id, truce],
      ]),
    })

    const result = getActiveTributeRelationships(world)
    expect(result).toHaveLength(1)
  })

  it('excludes treaties with status != active', () => {
    const cancelled = makeTreaty({ id: 'treaty_t1', status: 'cancelled' })
    const expired = makeTreaty({ id: 'treaty_t2', status: 'expired' })
    const broken = makeTreaty({ id: 'treaty_t3', status: 'broken' })
    const world = baseWorld({
      treaties: new Map([
        [cancelled.id, cancelled],
        [expired.id, expired],
        [broken.id, broken],
      ]),
    })

    expect(getActiveTributeRelationships(world)).toEqual([])
  })

  it('excludes treaties whose expiresAtTick has been reached', () => {
    const expiredTreaty = makeTreaty({ id: 'treaty_t1', expiresAtTick: 50 })
    const activeTreaty = makeTreaty({ id: 'treaty_t2', expiresAtTick: 200, signedAtTick: 60 })
    const world = baseWorld({
      tick: 100,
      treaties: new Map([
        [expiredTreaty.id, expiredTreaty],
        [activeTreaty.id, activeTreaty],
      ]),
    })

    const result = getActiveTributeRelationships(world)
    expect(result).toHaveLength(1)
    expect(result[0]?.activeSinceTick).toBe(60)
  })

  it('includes tribute relationship from accepted peace proposal within years window', () => {
    const proposal = makePeaceProposal({
      id: 'prop_t1',
      proposingRealmId: 'realm_qin',
      targetRealmId: 'realm_han',
      terms: [{ type: 'tribute', payload: { amountPerYear: 100, years: 5 } }],
    })
    const world = baseWorld({
      peaceProposals: new Map([[proposal.id, proposal]]),
    })

    const result = getActiveTributeRelationships(world)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      tributaryRealmId: 'realm_han',
      suzerainRealmId: 'realm_qin',
      activeSinceTick: 0,
    })
  })

  it('excludes peace tribute beyond its years window', () => {
    const ackDate: GameDate = { yearBC: 270, season: 'spring', month: 1, xun: 'shang' }
    const expired = makePeaceProposal({
      id: 'prop_t1',
      acknowledgedAt: ackDate,
      terms: [{ type: 'tribute', payload: { amountPerYear: 100, years: 3 } }],
    })
    const currentDate: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
    const world = baseWorld({
      date: currentDate,
      peaceProposals: new Map([[expired.id, expired]]),
    })

    expect(getActiveTributeRelationships(world)).toEqual([])
  })

  it('excludes peace proposals with status != accepted', () => {
    const pending = makePeaceProposal({ id: 'prop_t1', status: 'pending', acknowledgedAt: null })
    const rejected = makePeaceProposal({ id: 'prop_t2', status: 'rejected', acknowledgedAt: null })
    const world = baseWorld({
      peaceProposals: new Map([
        [pending.id, pending],
        [rejected.id, rejected],
      ]),
    })

    expect(getActiveTributeRelationships(world)).toEqual([])
  })

  it('combines treaty and peace tribute sources together', () => {
    const treaty = makeTreaty({
      id: 'treaty_t1',
      realmAId: 'realm_chu',
      realmBId: 'realm_qin',
      signedAtTick: 12,
    })
    const proposal = makePeaceProposal({
      id: 'prop_t1',
      proposingRealmId: 'realm_qin',
      targetRealmId: 'realm_han',
      terms: [{ type: 'tribute', payload: { amountPerYear: 50, years: 2 } }],
    })
    const world = baseWorld({
      treaties: new Map([[treaty.id, treaty]]),
      peaceProposals: new Map([[proposal.id, proposal]]),
    })

    const result = getActiveTributeRelationships(world)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.tributaryRealmId)).toEqual(['realm_chu', 'realm_han'])
  })

  it('returns deterministically sorted results across re-runs', () => {
    const treaty1 = makeTreaty({ id: 'treaty_z', realmAId: 'realm_chu', realmBId: 'realm_qin' })
    const treaty2 = makeTreaty({ id: 'treaty_a', realmAId: 'realm_han', realmBId: 'realm_qin' })
    const world = baseWorld({
      treaties: new Map([
        [treaty1.id, treaty1],
        [treaty2.id, treaty2],
      ]),
    })

    const a = getActiveTributeRelationships(world)
    const b = getActiveTributeRelationships(world)
    expect(a).toEqual(b)
    expect(a.map(r => r.tributaryRealmId)).toEqual(['realm_chu', 'realm_han'])
  })
})
