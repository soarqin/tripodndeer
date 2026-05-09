/* eslint-disable max-lines-per-function */
import { describe, expect, it } from 'vitest'

import { splitRealm } from '../realm-split'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  Army,
  CoalitionState,
  DiplomaticRelation,
  GameDate,
  General,
  GovernorAssignment,
  Pass,
  PeaceProposal,
  Realm,
  RealmId,
  RealmSplitEvent,
  RulerState,
  Site,
  SiteId,
  WarState,
  ZhouInvestitureState,
} from '~/shared/types'
import { warKey } from '~/engine/wars'
import { relationKey } from '~/engine/systems/diplomacy/diplomacy-core'

const OLD_REALM: RealmId = 'realm_old'
const NEW_REALM_A: RealmId = 'realm_a'
const NEW_REALM_B: RealmId = 'realm_b'
const OTHER_REALM: RealmId = 'realm_other'

const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }

function makeRealm(id: RealmId, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    economy: { treasury: 1000, foodStores: 800, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeSite(id: SiteId, ownerId: RealmId | null, overrides: Partial<Site> = {}): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 100, households: 25, taxBase: 50, foodProduction: 30 },
    ...overrides,
  }
}

function makeArmy(id: string, realmId: RealmId, location: SiteId, overrides: Partial<Army> = {}): Army {
  return {
    id,
    realmId,
    manpower: 1000,
    location,
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
    ...overrides,
  }
}

function makeGeneral(id: string, realmId: RealmId, overrides: Partial<General> = {}): General {
  return {
    id,
    realmId,
    name: id,
    might: 70,
    command: 70,
    loyalty: 80,
    ...overrides,
  }
}

function makeGovernorAssignment(
  siteId: SiteId,
  realmId: RealmId,
  generalId: string,
): GovernorAssignment {
  return {
    siteId,
    realmId,
    generalId,
    assignedAtTick: 0,
    modifierKind: 'tax_efficiency',
  }
}

function makeRuler(realmId: RealmId, generalId: string): RulerState {
  return {
    realmId,
    generalId,
    age: 40,
    lifespan: 65,
    health: 80,
    personality: 'steward',
    personalityDims: {
      expansionDrive: 0.5,
      diplomaticTrust: 0.5,
      caution: 0.5,
      honor: 0.5,
      vindictiveness: 0.5,
      reformInclination: 0.5,
      patience: 0.5,
      preferredStrategy: 'diplomatic',
    },
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
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

function makeRelation(a: RealmId, b: RealmId, attitude = 0, trust = 0): DiplomaticRelation {
  const sorted = [a, b].sort((x, y) => x.localeCompare(y))
  return {
    key: relationKey(a, b),
    realmAId: sorted[0]!,
    realmBId: sorted[1]!,
    attitude,
    trust,
    updatedAt: DATE,
  }
}

function makePeaceProposal(
  id: string,
  proposingRealmId: RealmId,
  targetRealmId: RealmId,
): PeaceProposal {
  return {
    id,
    proposingRealmId,
    targetRealmId,
    terms: [],
    proposedAt: DATE,
    status: 'pending',
    acknowledgedAt: null,
  }
}

function makePass(id: string, controllerId: RealmId): Pass {
  return {
    id,
    name: id,
    edgeId: `edge_${id}`,
    defenseBonus: 0.2,
    controllerId,
    fortification: 50,
  }
}

function makeCoalition(
  id: string,
  targetRealmId: RealmId,
  memberRealmIds: readonly RealmId[],
): CoalitionState {
  return {
    id,
    targetRealmId,
    memberRealmIds,
    status: 'active',
    formedAt: DATE,
    dissolvedAt: null,
  }
}

function makeZhouInvestiture(realmId: RealmId): ZhouInvestitureState {
  return {
    realmId,
    recognizedTitle: 'duke',
    grantedAtTick: 0,
    expiresAtTick: null,
    source: 'zhou',
  }
}

describe('splitRealm', () => {
  it('reassigns sites to their new realms per splitConfig', () => {
    const world = makeEmptyWorld({
      realms: new Map([[OLD_REALM, makeRealm(OLD_REALM)]]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
        ['site_3', makeSite('site_3', OLD_REALM)],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: {
        site_1: NEW_REALM_A,
        site_2: NEW_REALM_A,
        site_3: NEW_REALM_B,
      },
    })

    expect(result.world.sites.get('site_1')?.ownerId).toBe(NEW_REALM_A)
    expect(result.world.sites.get('site_2')?.ownerId).toBe(NEW_REALM_A)
    expect(result.world.sites.get('site_3')?.ownerId).toBe(NEW_REALM_B)
  })

  it('removes the old realm and creates each new realm', () => {
    const world = makeEmptyWorld({
      realms: new Map([[OLD_REALM, makeRealm(OLD_REALM)]]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    expect(result.world.realms.has(OLD_REALM)).toBe(false)
    expect(result.world.realms.has(NEW_REALM_A)).toBe(true)
    expect(result.world.realms.has(NEW_REALM_B)).toBe(true)
  })

  it('reassigns armies to follow the new owner of their location site', () => {
    const world = makeEmptyWorld({
      realms: new Map([[OLD_REALM, makeRealm(OLD_REALM)]]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      armies: new Map([
        ['army_1', makeArmy('army_1', OLD_REALM, 'site_1')],
        ['army_2', makeArmy('army_2', OLD_REALM, 'site_2')],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    expect(result.world.armies.get('army_1')?.realmId).toBe(NEW_REALM_A)
    expect(result.world.armies.get('army_2')?.realmId).toBe(NEW_REALM_B)
  })

  it('reassigns generals to follow their governor assignment site', () => {
    const world = makeEmptyWorld({
      realms: new Map([[OLD_REALM, makeRealm(OLD_REALM)]]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      generals: new Map([
        ['gen_1', makeGeneral('gen_1', OLD_REALM)],
        ['gen_2', makeGeneral('gen_2', OLD_REALM)],
      ]),
      governorAssignments: new Map([
        ['site_1', makeGovernorAssignment('site_1', OLD_REALM, 'gen_1')],
        ['site_2', makeGovernorAssignment('site_2', OLD_REALM, 'gen_2')],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    expect(result.world.generals.get('gen_1')?.realmId).toBe(NEW_REALM_A)
    expect(result.world.generals.get('gen_2')?.realmId).toBe(NEW_REALM_B)
  })

  it('updates governor assignments to point at the site\'s new realm', () => {
    const world = makeEmptyWorld({
      realms: new Map([[OLD_REALM, makeRealm(OLD_REALM)]]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      generals: new Map([
        ['gen_1', makeGeneral('gen_1', OLD_REALM)],
        ['gen_2', makeGeneral('gen_2', OLD_REALM)],
      ]),
      governorAssignments: new Map([
        ['site_1', makeGovernorAssignment('site_1', OLD_REALM, 'gen_1')],
        ['site_2', makeGovernorAssignment('site_2', OLD_REALM, 'gen_2')],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    expect(result.world.governorAssignments.get('site_1')?.realmId).toBe(NEW_REALM_A)
    expect(result.world.governorAssignments.get('site_2')?.realmId).toBe(NEW_REALM_B)
  })

  it('lets the primary new realm inherit ongoing wars with other realms', () => {
    const oldVsOtherKey = warKey(OLD_REALM, OTHER_REALM)
    const world = makeEmptyWorld({
      realms: new Map([
        [OLD_REALM, makeRealm(OLD_REALM)],
        [OTHER_REALM, makeRealm(OTHER_REALM)],
      ]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      wars: new Map([[oldVsOtherKey, makeWarState()]]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    const expectedKey = warKey(NEW_REALM_A, OTHER_REALM)
    expect(result.world.wars.has(oldVsOtherKey)).toBe(false)
    expect(result.world.wars.has(expectedKey)).toBe(true)
  })

  it('lets the primary new realm inherit diplomatic relations with other realms', () => {
    const world = makeEmptyWorld({
      realms: new Map([
        [OLD_REALM, makeRealm(OLD_REALM)],
        [OTHER_REALM, makeRealm(OTHER_REALM)],
      ]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      relations: new Map([
        [relationKey(OLD_REALM, OTHER_REALM), makeRelation(OLD_REALM, OTHER_REALM, 50, 30)],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    const expectedKey = relationKey(NEW_REALM_A, OTHER_REALM)
    expect(result.world.relations.has(relationKey(OLD_REALM, OTHER_REALM))).toBe(false)
    expect(result.world.relations.get(expectedKey)?.attitude).toBe(50)
    expect(result.world.relations.get(expectedKey)?.trust).toBe(30)
  })

  it('lets the primary new realm inherit the ruler state', () => {
    const world = makeEmptyWorld({
      realms: new Map([[OLD_REALM, makeRealm(OLD_REALM, { rulerId: 'gen_ruler' })]]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      generals: new Map([['gen_ruler', makeGeneral('gen_ruler', OLD_REALM)]]),
      rulers: new Map([[OLD_REALM, makeRuler(OLD_REALM, 'gen_ruler')]]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    expect(result.world.rulers.has(OLD_REALM)).toBe(false)
    expect(result.world.rulers.get(NEW_REALM_A)?.generalId).toBe('gen_ruler')
    expect(result.world.rulers.get(NEW_REALM_A)?.realmId).toBe(NEW_REALM_A)
    expect(result.world.rulers.has(NEW_REALM_B)).toBe(false)
    expect(result.world.realms.get(NEW_REALM_A)?.rulerId).toBe('gen_ruler')
    expect(result.world.realms.get(NEW_REALM_B)?.rulerId).toBe(null)
  })

  it('removes peace proposals involving the old realm', () => {
    const world = makeEmptyWorld({
      realms: new Map([
        [OLD_REALM, makeRealm(OLD_REALM)],
        [OTHER_REALM, makeRealm(OTHER_REALM)],
      ]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      peaceProposals: new Map([
        ['proposal_1', makePeaceProposal('proposal_1', OLD_REALM, OTHER_REALM)],
        ['proposal_2', makePeaceProposal('proposal_2', OTHER_REALM, OLD_REALM)],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    expect(result.world.peaceProposals.size).toBe(0)
  })

  it('reassigns passes controlled by the old realm to the primary new realm', () => {
    const world = makeEmptyWorld({
      realms: new Map([[OLD_REALM, makeRealm(OLD_REALM)]]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      passes: new Map([['pass_1', makePass('pass_1', OLD_REALM)]]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    expect(result.world.passes.get('pass_1')?.controllerId).toBe(NEW_REALM_A)
  })

  it('removes the old realm from any coalition memberships', () => {
    const world = makeEmptyWorld({
      realms: new Map([
        [OLD_REALM, makeRealm(OLD_REALM)],
        [OTHER_REALM, makeRealm(OTHER_REALM)],
      ]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      coalitions: new Map([
        ['coa_1', makeCoalition('coa_1', OTHER_REALM, [OLD_REALM, 'realm_third'])],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    const coalition = result.world.coalitions.get('coa_1')
    expect(coalition?.memberRealmIds).not.toContain(OLD_REALM)
    expect(coalition?.memberRealmIds).toEqual(['realm_third'])
  })

  it('lets the primary new realm inherit any zhou investiture', () => {
    const world = makeEmptyWorld({
      realms: new Map([[OLD_REALM, makeRealm(OLD_REALM)]]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
      zhouInvestiture: new Map([[OLD_REALM, makeZhouInvestiture(OLD_REALM)]]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    expect(result.world.zhouInvestiture.has(OLD_REALM)).toBe(false)
    expect(result.world.zhouInvestiture.get(NEW_REALM_A)?.realmId).toBe(NEW_REALM_A)
    expect(result.world.zhouInvestiture.has(NEW_REALM_B)).toBe(false)
  })

  it('splits treasury and food stores proportionally by site count', () => {
    const world = makeEmptyWorld({
      realms: new Map([
        [
          OLD_REALM,
          makeRealm(OLD_REALM, { economy: { treasury: 1000, foodStores: 800, taxRate: 10 } }),
        ],
      ]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
        ['site_3', makeSite('site_3', OLD_REALM)],
        ['site_4', makeSite('site_4', OLD_REALM)],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: {
        site_1: NEW_REALM_A,
        site_2: NEW_REALM_A,
        site_3: NEW_REALM_A,
        site_4: NEW_REALM_B,
      },
    })

    expect(result.world.realms.get(NEW_REALM_A)?.economy.treasury).toBe(750)
    expect(result.world.realms.get(NEW_REALM_A)?.economy.foodStores).toBe(600)
    expect(result.world.realms.get(NEW_REALM_B)?.economy.treasury).toBe(250)
    expect(result.world.realms.get(NEW_REALM_B)?.economy.foodStores).toBe(200)
  })

  it('handles a degenerate single-site split into a single new realm', () => {
    const world = makeEmptyWorld({
      realms: new Map([
        [OLD_REALM, makeRealm(OLD_REALM, { economy: { treasury: 500, foodStores: 400, taxRate: 10 } })],
      ]),
      sites: new Map([['site_1', makeSite('site_1', OLD_REALM)]]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A },
    })

    expect(result.world.realms.has(OLD_REALM)).toBe(false)
    expect(result.world.realms.has(NEW_REALM_A)).toBe(true)
    expect(result.world.sites.get('site_1')?.ownerId).toBe(NEW_REALM_A)
    expect(result.world.realms.get(NEW_REALM_A)?.economy.treasury).toBe(500)
    expect(result.world.realms.get(NEW_REALM_A)?.economy.foodStores).toBe(400)
  })

  it('emits a realmSplit event with the old and new realm ids', () => {
    const world = makeEmptyWorld({
      realms: new Map([[OLD_REALM, makeRealm(OLD_REALM)]]),
      sites: new Map([
        ['site_1', makeSite('site_1', OLD_REALM)],
        ['site_2', makeSite('site_2', OLD_REALM)],
      ]),
    })

    const result = splitRealm(world, OLD_REALM, {
      newRealmIdsBySite: { site_1: NEW_REALM_A, site_2: NEW_REALM_B },
    })

    expect(result.events).toHaveLength(1)
    const event = result.events[0] as RealmSplitEvent
    expect(event.type).toBe('realmSplit')
    expect(event.payload.oldRealmId).toBe(OLD_REALM)
    expect(event.payload.newRealmIds).toEqual([NEW_REALM_A, NEW_REALM_B])
  })
})
