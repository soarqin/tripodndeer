import { describe, expect, it } from 'vitest'
import { evaluateFactionBalanceAction } from '../faction-balancing'
import type {
  EdictState,
  FactionId,
  FactionInfluenceState,
  Realm,
  RealmId,
  World,
} from '~/shared/types'

function makeRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000',
    capital: 'site_x',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    economy: { treasury: 0, foodStores: 0, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
  }
}

function makeFactionState(
  realmId: RealmId,
  influences: ReadonlyArray<readonly [FactionId, number]>,
): FactionInfluenceState {
  return { realmId, influences: new Map(influences) }
}

function makeWorld(opts: {
  realm: Realm
  playerRealmId?: RealmId
  factionInfluences?: ReadonlyMap<RealmId, FactionInfluenceState>
  edicts?: ReadonlyMap<string, EdictState>
  tick?: number
}): World {
  return {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: opts.tick ?? 100,
    sites: new Map(),
    realms: new Map([[opts.realm.id, opts.realm]]),
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
    rulers: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    disasterStates: new Map(),
    tradeRoutes: new Map(),
    factionInfluences: opts.factionInfluences ?? new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: opts.edicts ?? new Map(),
    governorAssignments: new Map(),
    playerRealmId: opts.playerRealmId ?? 'realm_player',
    rngState: { seed: 42, counter: 0 },
    phases: [],
    pendingOrders: [],
  } as unknown as World
}

describe('evaluateFactionBalanceAction', () => {
  it('AI issues edict when imbalance exceeds proximity threshold (>60)', () => {
    const realm = makeRealm('realm_qin')
    const world = makeWorld({
      realm,
      playerRealmId: 'realm_player',
      factionInfluences: new Map([
        [
          'realm_qin',
          makeFactionState('realm_qin', [
            ['military_meritocracy', 80],
            ['noble_clans', 10],
            ['royal_kin', 50],
            ['reformists', 50],
            ['conservatives', 50],
            ['foreign_clients', 50],
          ]),
        ],
      ]),
    })

    const result = evaluateFactionBalanceAction(world, realm)

    expect(result.edicts.size).toBe(1)
    const issued = [...result.edicts.values()][0]!
    expect(issued.realmId).toBe('realm_qin')
    expect(issued.status).toBe('active')
    expect(issued.kind).toBe('edict_tax_relief')
    expect(issued.durationMonths).toBe(6)
    expect(issued.remainingMonths).toBe(6)
    expect(issued.startedAtTick).toBe(world.tick)
  })

  it('AI does NOT issue edict when influence is balanced (imbalance <= 60)', () => {
    const realm = makeRealm('realm_qin')
    const world = makeWorld({
      realm,
      playerRealmId: 'realm_player',
      factionInfluences: new Map([
        [
          'realm_qin',
          makeFactionState('realm_qin', [
            ['military_meritocracy', 60],
            ['noble_clans', 50],
            ['royal_kin', 50],
            ['reformists', 50],
            ['conservatives', 50],
            ['foreign_clients', 50],
          ]),
        ],
      ]),
    })

    const result = evaluateFactionBalanceAction(world, realm)

    expect(result).toBe(world)
    expect(result.edicts.size).toBe(0)
  })

  it('AI does NOT issue another edict when realm already has an active edict', () => {
    const realm = makeRealm('realm_qin')
    const existingEdict: EdictState = {
      id: 'edict_existing',
      realmId: 'realm_qin',
      kind: 'edict_grain_reserve',
      startedAtTick: 50,
      durationMonths: 6,
      remainingMonths: 4,
      status: 'active',
    }
    const world = makeWorld({
      realm,
      playerRealmId: 'realm_player',
      factionInfluences: new Map([
        [
          'realm_qin',
          makeFactionState('realm_qin', [
            ['military_meritocracy', 90],
            ['noble_clans', 10],
            ['royal_kin', 50],
            ['reformists', 50],
            ['conservatives', 50],
            ['foreign_clients', 50],
          ]),
        ],
      ]),
      edicts: new Map([['edict_existing', existingEdict]]),
    })

    const result = evaluateFactionBalanceAction(world, realm)

    expect(result).toBe(world)
    expect(result.edicts.size).toBe(1)
    expect(result.edicts.get('edict_existing')).toBe(existingEdict)
  })

  it('player realm is skipped even when imbalanced', () => {
    const realm = makeRealm('realm_player')
    const world = makeWorld({
      realm,
      playerRealmId: 'realm_player',
      factionInfluences: new Map([
        [
          'realm_player',
          makeFactionState('realm_player', [
            ['military_meritocracy', 95],
            ['noble_clans', 5],
            ['royal_kin', 50],
            ['reformists', 50],
            ['conservatives', 50],
            ['foreign_clients', 50],
          ]),
        ],
      ]),
    })

    const result = evaluateFactionBalanceAction(world, realm)

    expect(result).toBe(world)
    expect(result.edicts.size).toBe(0)
  })

  it('expired edicts do not block new issuance', () => {
    const realm = makeRealm('realm_qin')
    const expiredEdict: EdictState = {
      id: 'edict_old',
      realmId: 'realm_qin',
      kind: 'edict_tax_relief',
      startedAtTick: 10,
      durationMonths: 6,
      remainingMonths: 0,
      status: 'expired',
    }
    const world = makeWorld({
      realm,
      playerRealmId: 'realm_player',
      factionInfluences: new Map([
        [
          'realm_qin',
          makeFactionState('realm_qin', [
            ['noble_clans', 80],
            ['military_meritocracy', 10],
            ['royal_kin', 50],
            ['reformists', 50],
            ['conservatives', 50],
            ['foreign_clients', 50],
          ]),
        ],
      ]),
      edicts: new Map([['edict_old', expiredEdict]]),
    })

    const result = evaluateFactionBalanceAction(world, realm)

    expect(result.edicts.size).toBe(2)
    const newEdict = [...result.edicts.values()].find(e => e.status === 'active')!
    expect(newEdict.kind).toBe('edict_grain_reserve')
    expect(newEdict.realmId).toBe('realm_qin')
  })

  it('returns world unchanged when realm has no faction influence state', () => {
    const realm = makeRealm('realm_qin')
    const world = makeWorld({
      realm,
      playerRealmId: 'realm_player',
      factionInfluences: new Map(),
    })

    const result = evaluateFactionBalanceAction(world, realm)

    expect(result).toBe(world)
  })
})
