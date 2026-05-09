import { describe, expect, it } from 'vitest'
import { evaluateFactionBalanceAction } from '../faction-balancing'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  EdictState,
  FactionId,
  FactionInfluenceState,
  PersonalityArchetype,
  Realm,
  RealmId,
  RulerState,
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
  rulers?: ReadonlyMap<RealmId, RulerState>
  tick?: number
}): World {
  return makeEmptyWorld({
    tick: opts.tick ?? 100,
    realms: new Map([[opts.realm.id, opts.realm]]),
    factionInfluences: opts.factionInfluences ?? new Map(),
    edicts: opts.edicts ?? new Map(),
    rulers: opts.rulers ?? new Map(),
    playerRealmId: opts.playerRealmId ?? 'realm_player',
    rngState: { seed: 42, counter: 0 },
  })
}

function makeRuler(realmId: RealmId, personality: PersonalityArchetype): RulerState {
  return {
    realmId,
    generalId: `${realmId}_ruler`,
    age: 40,
    lifespan: 70,
    health: 100,
    personality,
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

function makePersonalityWorld(opts: {
  personality: PersonalityArchetype
  dominantFaction?: FactionId
  maxInfluence: number
  minInfluence: number
  tick?: number
  edicts?: ReadonlyMap<string, EdictState>
}): { realm: Realm; world: World } {
  const realm = makeRealm('realm_qin')
  const dominantFaction = opts.dominantFaction ?? 'military_meritocracy'
  const influences = new Map<FactionId, number>([
    ['military_meritocracy', 50],
    ['noble_clans', 50],
    ['royal_kin', 50],
    ['reformists', 50],
    ['conservatives', 50],
    ['foreign_clients', opts.minInfluence],
  ])
  influences.set(dominantFaction, opts.maxInfluence)

  const world = makeWorld({
    realm,
    tick: opts.tick,
    factionInfluences: new Map([[realm.id, makeFactionState(realm.id, [...influences.entries()])]]),
    edicts: opts.edicts,
    rulers: new Map([[realm.id, makeRuler(realm.id, opts.personality)]]),
  })

  return { realm, world }
}

function countIssuedEdicts(personality: PersonalityArchetype, maxInfluence: number, minInfluence: number): number {
  let issued = 0
  let edicts = new Map<string, EdictState>()

  for (let month = 0; month < 12; month += 1) {
    const activeEdict = [...edicts.values()].find(edict => edict.status === 'active')
    if (activeEdict && month - activeEdict.startedAtTick >= activeEdict.durationMonths) {
      edicts = new Map(edicts)
      edicts.set(activeEdict.id, { ...activeEdict, status: 'expired', remainingMonths: 0 })
    }

    const { realm, world } = makePersonalityWorld({
      personality,
      maxInfluence,
      minInfluence,
      tick: month,
      edicts,
    })
    const result = evaluateFactionBalanceAction(world, realm)
    if (result.edicts.size > edicts.size) issued += 1
    edicts = new Map(result.edicts)
  }

  return issued
}

describe('evaluateFactionBalanceAction - basic', () => {
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

describe('evaluateFactionBalanceAction - personality bias', () => {
  it('tyrant favors grain reserve edicts in high-imbalance runs', () => {
    let grainReserveCount = 0

    for (let run = 0; run < 50; run += 1) {
      const { realm, world } = makePersonalityWorld({
        personality: 'tyrant',
        dominantFaction: 'military_meritocracy',
        maxInfluence: 80,
        minInfluence: 0,
        tick: run,
      })
      const result = evaluateFactionBalanceAction(world, realm)
      const issued = [...result.edicts.values()][0]
      if (issued?.kind === 'edict_grain_reserve') grainReserveCount += 1
    }

    expect(grainReserveCount).toBeGreaterThan(30)
  })

  it('benevolent favors tax relief edicts in high-imbalance runs', () => {
    let taxReliefCount = 0

    for (let run = 0; run < 50; run += 1) {
      const { realm, world } = makePersonalityWorld({
        personality: 'benevolent',
        dominantFaction: 'noble_clans',
        maxInfluence: 80,
        minInfluence: 0,
        tick: run,
      })
      const result = evaluateFactionBalanceAction(world, realm)
      const issued = [...result.edicts.values()][0]
      if (issued?.kind === 'edict_tax_relief') taxReliefCount += 1
    }

    expect(taxReliefCount).toBeGreaterThan(35)
  })

  it('conqueror issues at a lower imbalance threshold than steward', () => {
    const conquerorRun = makePersonalityWorld({
      personality: 'conqueror',
      maxInfluence: 70,
      minInfluence: 21,
    })
    const stewardRun = makePersonalityWorld({
      personality: 'steward',
      maxInfluence: 70,
      minInfluence: 21,
    })

    const conquerorResult = evaluateFactionBalanceAction(conquerorRun.world, conquerorRun.realm)
    const stewardResult = evaluateFactionBalanceAction(stewardRun.world, stewardRun.realm)

    expect(conquerorResult.edicts.size).toBe(1)
    expect(stewardResult).toBe(stewardRun.world)
    expect(stewardResult.edicts.size).toBe(0)
  })

  it('incompetent issues edicts no more than half as often as builder over twelve months', () => {
    const builderIssued = countIssuedEdicts('builder', 80, 24)
    const incompetentIssued = countIssuedEdicts('incompetent', 80, 24)

    expect(builderIssued).toBeGreaterThan(0)
    expect(incompetentIssued).toBeLessThanOrEqual(builderIssued / 2)
  })
})
