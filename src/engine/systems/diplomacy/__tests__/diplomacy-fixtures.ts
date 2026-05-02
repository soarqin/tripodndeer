import { relationKey } from '../diplomacy-core'
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

export const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
export const qin = 'realm_qin'
export const han = 'realm_han'
export const wei = 'realm_wei'

export function makeRealm(id: string, manpowerPool = 1000): Realm {
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
    stats: { manpowerPool, manpowerCap: Math.max(manpowerPool, 5000), warWeariness: 0 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

export function makeSite(id: string, ownerId: string | null): Site {
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

export function makeArmy(id: string, realmId: string, manpower: number): Army {
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

export function makeWarState(): WarState {
  return {
    casusBelli: null,
    declaredAt: DATE,
    occupiedSites: new Map(),
    peaceProposalId: null,
  }
}

export function makeRelation(overrides: Partial<DiplomaticRelation> = {}): DiplomaticRelation {
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

export function makeProposal(overrides: Partial<DiplomaticProposal> = {}): DiplomaticProposal {
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

export function makeTreaty(overrides: Partial<Treaty> = {}): Treaty {
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

export function baseWorld(overrides: Partial<World> = {}): World {
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
    rulers: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    disasterStates: new Map(),
    tradeRoutes: new Map(),
    factionInfluences: new Map(),
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
