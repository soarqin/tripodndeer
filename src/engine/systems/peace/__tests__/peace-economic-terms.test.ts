import { describe, expect, it } from 'vitest'

import { economyPhase } from '~/engine/systems/economy/economy-phase'
import { warKey } from '~/engine/wars'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type { GameDate, PeaceProposal, Realm, RNGState, WarState, World } from '~/shared/types'
import { acceptProposal, createPeaceProposal } from '../index'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const NEXT_YEAR: GameDate = { yearBC: 259, season: 'spring', month: 1, xun: 'shang' }
const RNG: RNGState = { seed: 42, counter: 0 }
const proposingRealmId = 'realm_qin'
const targetRealmId = 'realm_han'

function makeRealm(id: string, treasury: number, foodStores = 0): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury, foodStores, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
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
  return makeEmptyWorld({
    date: DATE,
    tick: 12,
    realms: new Map([
      [proposingRealmId, makeRealm(proposingRealmId, 0)],
      [targetRealmId, makeRealm(targetRealmId, 0)],
    ]),
    wars: new Map([[warKey(proposingRealmId, targetRealmId), makeWarState()]]),
    playerRealmId: proposingRealmId,
    rngState: RNG,
    ...overrides,
  })
}

function withRealms(proposerTreasury: number, targetTreasury: number, proposerFood = 0, targetFood = 0): World {
  return baseWorld({
    realms: new Map([
      [proposingRealmId, makeRealm(proposingRealmId, proposerTreasury, proposerFood)],
      [targetRealmId, makeRealm(targetRealmId, targetTreasury, targetFood)],
    ]),
  })
}

function acceptedTributeProposal(amountPerYear: number, years: number, acknowledgedAt: GameDate = DATE): PeaceProposal {
  return {
    id: 'prop_tribute',
    proposingRealmId,
    targetRealmId,
    terms: [{ type: 'tribute', payload: { amountPerYear, years } }],
    proposedAt: DATE,
    status: 'accepted',
    acknowledgedAt,
  }
}

describe('peace economic terms', () => {
  it('transfers accepted indemnity once from proposal target to proposer', () => {
    const world = withRealms(100, 750)
    const created = createPeaceProposal(world, {
      id: 'prop_indemnity',
      proposingRealmId,
      targetRealmId,
      terms: [{ type: 'indemnity', payload: { amount: 300 } }],
      proposedAt: DATE,
    }).world

    const accepted = acceptProposal(created, 'prop_indemnity', DATE)
    const acceptedAgain = acceptProposal(accepted, 'prop_indemnity', DATE)

    expect(accepted.realms.get(proposingRealmId)?.economy.treasury).toBe(400)
    expect(accepted.realms.get(targetRealmId)?.economy.treasury).toBe(450)
    expect(acceptedAgain).toBe(accepted)
    expect(acceptedAgain.realms.get(proposingRealmId)?.economy.treasury).toBe(400)
    expect(acceptedAgain.realms.get(targetRealmId)?.economy.treasury).toBe(450)
  })

  it('clamps accepted indemnity to the payer treasury', () => {
    const world = withRealms(10, 80)
    const created = createPeaceProposal(world, {
      id: 'prop_indemnity',
      proposingRealmId,
      targetRealmId,
      terms: [{ type: 'indemnity', payload: { amount: 1000 } }],
      proposedAt: DATE,
    }).world

    const accepted = acceptProposal(created, 'prop_indemnity', DATE)

    expect(accepted.realms.get(proposingRealmId)?.economy.treasury).toBe(90)
    expect(accepted.realms.get(targetRealmId)?.economy.treasury).toBe(0)
  })

  it('transfers monthly tribute while the accepted term remains active', () => {
    const world = withRealms(0, 50)
    const peaceProposals = new Map([
      ['prop_tribute', acceptedTributeProposal(120, 1)],
    ])

    const result = economyPhase({ ...world, peaceProposals }, RNG)

    expect(result.world.realms.get(proposingRealmId)?.economy.treasury).toBe(10)
    expect(result.world.realms.get(targetRealmId)?.economy.treasury).toBe(40)
    expect(result.events.map(event => event.payload)).toEqual([
      { realmId: targetRealmId, treasuryDelta: -10, foodStoresDelta: 0, populationDelta: 0, householdsDelta: 0, settledAtTick: 12 },
      { realmId: proposingRealmId, treasuryDelta: 10, foodStoresDelta: 0, populationDelta: 0, householdsDelta: 0, settledAtTick: 12 },
    ])
  })

  it('clamps monthly tribute and receiver gains only the actual paid amount', () => {
    const world = withRealms(5, 40)
    const peaceProposals = new Map([
      ['prop_tribute', acceptedTributeProposal(1200, 1)],
    ])

    const result = economyPhase({ ...world, peaceProposals }, RNG)

    expect(result.world.realms.get(proposingRealmId)?.economy.treasury).toBe(45)
    expect(result.world.realms.get(targetRealmId)?.economy.treasury).toBe(0)
  })

  it('does not transfer tribute after the accepted term expires', () => {
    const world = withRealms(5, 40)
    const peaceProposals = new Map([
      ['prop_tribute', acceptedTributeProposal(1200, 1, DATE)],
    ])

    const result = economyPhase({ ...world, date: NEXT_YEAR, peaceProposals }, RNG)

    expect(result.world.realms.get(proposingRealmId)?.economy.treasury).toBe(5)
    expect(result.world.realms.get(targetRealmId)?.economy.treasury).toBe(40)
  })

  it('floors small annual tribute to zero monthly treasury transfer', () => {
    const world = withRealms(5, 40)
    const peaceProposals = new Map([
      ['prop_tribute', acceptedTributeProposal(5, 1)],
    ])

    const result = economyPhase({ ...world, peaceProposals }, RNG)

    expect(result.world.realms.get(proposingRealmId)?.economy.treasury).toBe(5)
    expect(result.world.realms.get(targetRealmId)?.economy.treasury).toBe(40)
  })

  it('does not transfer foodStores for economic peace terms', () => {
    const world = withRealms(0, 500, 25, 999)
    const peaceProposals = new Map([
      ['prop_tribute', acceptedTributeProposal(120, 1)],
    ])

    const result = economyPhase({ ...world, peaceProposals }, RNG)

    expect(result.world.realms.get(proposingRealmId)?.economy.foodStores).toBe(25)
    expect(result.world.realms.get(targetRealmId)?.economy.foodStores).toBe(999)
  })
})
