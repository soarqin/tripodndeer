import { describe, expect, it } from 'vitest'

import { factionPhase } from '../faction-phase'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import {
  M42_FACTION_DRIFT_PER_GENERAL_BP,
  M42_FACTION_INFLUENCE_INITIAL,
  M42_FACTION_INFLUENCE_MAX,
  M42_FACTION_INFLUENCE_MIN,
} from '~/content/m2/balance'
import type {
  FactionId,
  FactionInfluenceState,
  General,
  PersonalityArchetype,
  PoliticalSystem,
  Realm,
  RNGState,
  RulerState,
  World,
} from '~/shared/types'

const RNG: RNGState = { seed: 42, counter: 0 }
const ALL_FACTIONS: readonly FactionId[] = [
  'royal_kin',
  'noble_clans',
  'military_meritocracy',
  'reformists',
  'conservatives',
  'foreign_clients',
]

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_capital',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeRuler(personality: PersonalityArchetype, overrides: Partial<RulerState> = {}): RulerState {
  return {
    realmId: 'realm_qin',
    generalId: 'gen_ruler',
    age: 30,
    lifespan: 60,
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
    ...overrides,
  }
}

function makeGeneral(id: string, faction: FactionId | undefined, overrides: Partial<General> = {}): General {
  return {
    id,
    realmId: 'realm_qin',
    name: id,
    might: 50,
    command: 50,
    loyalty: 80,
    faction,
    ...overrides,
  }
}

function makeWorld(opts: {
  xun?: 'shang' | 'zhong' | 'xia'
  realm?: Partial<Realm>
  ruler?: RulerState | null
  generals?: General[]
  factionInfluences?: ReadonlyMap<string, FactionInfluenceState>
  playerRealmId?: string
} = {}): World {
  const realm = makeRealm(opts.realm)
  const date = { yearBC: 260, season: 'spring', month: 1, xun: opts.xun ?? 'shang' } as const
  const generalsMap = new Map<string, General>()
  for (const g of opts.generals ?? []) {
    generalsMap.set(g.id, g)
  }
  const rulers = new Map<string, RulerState>()
  if (opts.ruler !== null) {
    rulers.set(realm.id, opts.ruler ?? makeRuler('benevolent'))
  }
  return makeEmptyWorld({
    date,
    realms: new Map([[realm.id, realm]]),
    rulers,
    generals: generalsMap,
    factionInfluences: opts.factionInfluences ?? new Map(),
    playerRealmId: opts.playerRealmId ?? realm.id,
  })
}

function getInfluence(world: World, realmId: string, faction: FactionId): number {
  const state = world.factionInfluences.get(realmId)
  if (!state) throw new Error(`No faction state for ${realmId}`)
  const value = state.influences.get(faction)
  if (value === undefined) throw new Error(`No influence for ${faction}`)
  return value
}

describe('factionPhase: early return', () => {
  it('returns unchanged world when xun is zhong', () => {
    const world = makeWorld({ xun: 'zhong' })
    const result = factionPhase(world, RNG)
    expect(result.world).toBe(world)
    expect(result.nextRng).toEqual(RNG)
    expect(result.events).toEqual([])
  })

  it('returns unchanged world when xun is xia', () => {
    const world = makeWorld({ xun: 'xia' })
    const result = factionPhase(world, RNG)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })
})

describe('factionPhase: initialization', () => {
  it('initializes 6 dimensions to M42_FACTION_INFLUENCE_INITIAL when missing', () => {
    const world = makeWorld({
      ruler: null,
      realm: { politicalSystem: 'enfeoffment' as PoliticalSystem },
    })
    expect(world.factionInfluences.get('realm_qin')).toBeUndefined()

    const result = factionPhase(world, RNG)
    const state = result.world.factionInfluences.get('realm_qin')
    expect(state).toBeDefined()
    expect(state!.realmId).toBe('realm_qin')
    expect(state!.influences.size).toBe(6)
    for (const fid of ALL_FACTIONS) {
      expect(state!.influences.has(fid)).toBe(true)
    }
    expect(getInfluence(result.world, 'realm_qin', 'royal_kin')).toBeCloseTo(M42_FACTION_INFLUENCE_INITIAL, 6)
    expect(getInfluence(result.world, 'realm_qin', 'reformists')).toBeCloseTo(M42_FACTION_INFLUENCE_INITIAL, 6)
  })
})

describe('factionPhase: general drift', () => {
  it('single general with faction increases corresponding influence', () => {
    const world = makeWorld({
      ruler: null,
      realm: { politicalSystem: 'enfeoffment' as PoliticalSystem },
      generals: [makeGeneral('gen1', 'reformists')],
    })
    const result = factionPhase(world, RNG)
    const expected = M42_FACTION_INFLUENCE_INITIAL + M42_FACTION_DRIFT_PER_GENERAL_BP / 10000
    expect(getInfluence(result.world, 'realm_qin', 'reformists')).toBeCloseTo(expected, 6)
  })

  it('multiple generals of the same faction stack drift', () => {
    const world = makeWorld({
      ruler: null,
      realm: { politicalSystem: 'enfeoffment' as PoliticalSystem },
      generals: [
        makeGeneral('gen1', 'royal_kin'),
        makeGeneral('gen2', 'royal_kin'),
        makeGeneral('gen3', 'royal_kin'),
      ],
    })
    const result = factionPhase(world, RNG)
    const expected = M42_FACTION_INFLUENCE_INITIAL + (3 * M42_FACTION_DRIFT_PER_GENERAL_BP) / 10000
    expect(getInfluence(result.world, 'realm_qin', 'royal_kin')).toBeCloseTo(expected, 6)
  })

  it('generals from other realms are ignored', () => {
    const otherRealm = makeRealm({ id: 'realm_other', politicalSystem: 'enfeoffment' as PoliticalSystem })
    const realm = makeRealm({ politicalSystem: 'enfeoffment' as PoliticalSystem })
    const world = makeEmptyWorld({
      realms: new Map([
        [realm.id, realm],
        [otherRealm.id, otherRealm],
      ]),
      generals: new Map([
        ['gen_other', makeGeneral('gen_other', 'reformists', { realmId: 'realm_other' })],
      ]),
      playerRealmId: realm.id,
    })
    const result = factionPhase(world, RNG)
    expect(getInfluence(result.world, 'realm_qin', 'reformists')).toBeCloseTo(M42_FACTION_INFLUENCE_INITIAL, 6)
  })

  it('generals without a faction do not contribute drift', () => {
    const world = makeWorld({
      ruler: null,
      realm: { politicalSystem: 'enfeoffment' as PoliticalSystem },
      generals: [makeGeneral('gen1', undefined)],
    })
    const result = factionPhase(world, RNG)
    const NEUTRAL_FACTIONS: readonly FactionId[] = ['royal_kin', 'reformists', 'conservatives', 'foreign_clients']
    for (const fid of NEUTRAL_FACTIONS) {
      expect(getInfluence(result.world, 'realm_qin', fid)).toBeCloseTo(M42_FACTION_INFLUENCE_INITIAL, 6)
    }
  })
})

describe('factionPhase: ruler personality drift', () => {
  it('conqueror ruler drifts toward military_meritocracy', () => {
    const world = makeWorld({
      ruler: makeRuler('conqueror'),
      realm: { politicalSystem: 'commandery' as PoliticalSystem },
    })
    const baseline = makeWorld({
      ruler: null,
      realm: { politicalSystem: 'commandery' as PoliticalSystem },
    })
    const result = factionPhase(world, RNG)
    const baselineResult = factionPhase(baseline, RNG)
    const withRuler = getInfluence(result.world, 'realm_qin', 'military_meritocracy')
    const withoutRuler = getInfluence(baselineResult.world, 'realm_qin', 'military_meritocracy')
    expect(withRuler).toBeGreaterThan(withoutRuler)
  })

  it('benevolent ruler drifts toward royal_kin', () => {
    const world = makeWorld({
      ruler: makeRuler('benevolent'),
      realm: { politicalSystem: 'commandery' as PoliticalSystem },
    })
    const result = factionPhase(world, RNG)
    expect(getInfluence(result.world, 'realm_qin', 'royal_kin')).toBeGreaterThan(M42_FACTION_INFLUENCE_INITIAL)
  })
})

describe('factionPhase: political system drift', () => {
  it('legalist_centralized drifts toward military_meritocracy and away from noble_clans', () => {
    const world = makeWorld({
      ruler: null,
      realm: { politicalSystem: 'legalist_centralized' as PoliticalSystem },
    })
    const result = factionPhase(world, RNG)
    expect(getInfluence(result.world, 'realm_qin', 'military_meritocracy')).toBeGreaterThan(M42_FACTION_INFLUENCE_INITIAL)
    expect(getInfluence(result.world, 'realm_qin', 'noble_clans')).toBeLessThan(M42_FACTION_INFLUENCE_INITIAL)
  })

  it('enfeoffment drifts toward noble_clans', () => {
    const world = makeWorld({
      ruler: null,
      realm: { politicalSystem: 'enfeoffment' as PoliticalSystem },
    })
    const result = factionPhase(world, RNG)
    expect(getInfluence(result.world, 'realm_qin', 'noble_clans')).toBeGreaterThan(M42_FACTION_INFLUENCE_INITIAL)
  })
})

describe('factionPhase: clamping', () => {
  it('clamps to maximum (cannot exceed 100)', () => {
    const initial: FactionInfluenceState = {
      realmId: 'realm_qin',
      influences: new Map(ALL_FACTIONS.map(f => [f, M42_FACTION_INFLUENCE_MAX])),
    }
    const world = makeWorld({
      ruler: makeRuler('conqueror'),
      realm: { politicalSystem: 'legalist_centralized' as PoliticalSystem },
      generals: Array.from({ length: 10 }, (_, i) => makeGeneral(`gen${i}`, 'military_meritocracy')),
      factionInfluences: new Map([['realm_qin', initial]]),
    })
    const result = factionPhase(world, RNG)
    expect(getInfluence(result.world, 'realm_qin', 'military_meritocracy')).toBe(M42_FACTION_INFLUENCE_MAX)
  })

  it('clamps to minimum (cannot go below 0)', () => {
    const initial: FactionInfluenceState = {
      realmId: 'realm_qin',
      influences: new Map(ALL_FACTIONS.map(f => [f, M42_FACTION_INFLUENCE_MIN])),
    }
    const world = makeWorld({
      ruler: null,
      realm: { politicalSystem: 'legalist_centralized' as PoliticalSystem },
      factionInfluences: new Map([['realm_qin', initial]]),
    })
    const result = factionPhase(world, RNG)
    expect(getInfluence(result.world, 'realm_qin', 'noble_clans')).toBe(M42_FACTION_INFLUENCE_MIN)
  })
})

describe('factionPhase: trait stability multiplier', () => {
  it('factionStabilityBonusBp reduces drift speed', () => {
    const realmWithoutTrait = makeRealm({ politicalSystem: 'enfeoffment' as PoliticalSystem })
    const realmWithTrait = makeRealm({
      politicalSystem: 'enfeoffment' as PoliticalSystem,
      traits: ['qi_jixia_reform_done'],
    })

    const baseWorld = makeEmptyWorld({
      realms: new Map([[realmWithoutTrait.id, realmWithoutTrait]]),
      generals: new Map([['gen1', makeGeneral('gen1', 'noble_clans')]]),
      playerRealmId: realmWithoutTrait.id,
    })
    const traitWorld = makeEmptyWorld({
      realms: new Map([[realmWithTrait.id, realmWithTrait]]),
      generals: new Map([['gen1', makeGeneral('gen1', 'noble_clans')]]),
      playerRealmId: realmWithTrait.id,
    })

    const baseResult = factionPhase(baseWorld, RNG)
    const traitResult = factionPhase(traitWorld, RNG)

    const baseDrift = getInfluence(baseResult.world, 'realm_qin', 'noble_clans') - M42_FACTION_INFLUENCE_INITIAL
    const traitDrift = getInfluence(traitResult.world, 'realm_qin', 'noble_clans') - M42_FACTION_INFLUENCE_INITIAL

    expect(traitDrift).toBeLessThan(baseDrift)
    expect(traitDrift).toBeGreaterThan(0)
  })
})

describe('factionPhase: robustness', () => {
  it('processes realm without ruler without crashing', () => {
    const world = makeWorld({
      ruler: null,
      realm: { politicalSystem: 'commandery' as PoliticalSystem },
    })
    expect(() => factionPhase(world, RNG)).not.toThrow()
    const result = factionPhase(world, RNG)
    expect(result.world.factionInfluences.get('realm_qin')).toBeDefined()
  })

  it('does not advance RNG state (deterministic)', () => {
    const world = makeWorld({ ruler: makeRuler('conqueror') })
    const rng: RNGState = { seed: 12345, counter: 7 }
    const result = factionPhase(world, rng)
    expect(result.nextRng).toEqual(rng)
    expect(result.nextRng).toBe(rng)
  })

  it('does NOT normalize influence sum (each dimension drifts independently)', () => {
    const world = makeWorld({
      ruler: makeRuler('conqueror'),
      realm: { politicalSystem: 'legalist_centralized' as PoliticalSystem },
      generals: [
        makeGeneral('gen1', 'military_meritocracy'),
        makeGeneral('gen2', 'royal_kin'),
      ],
    })
    const result = factionPhase(world, RNG)
    const sum = ALL_FACTIONS.reduce(
      (acc, fid) => acc + getInfluence(result.world, 'realm_qin', fid),
      0,
    )
    const initialSum = 6 * M42_FACTION_INFLUENCE_INITIAL
    expect(sum).not.toBe(initialSum)
    expect(Math.abs(sum - initialSum)).toBeGreaterThan(0)
  })
})

describe('factionPhase: edict issuance wiring (T12)', () => {
  it('factionPhase with tyrant realm + imbalance issues a new edict via evaluateFactionBalanceAction', () => {
    const initialInfluences: FactionInfluenceState = {
      realmId: 'realm_qin',
      influences: new Map<FactionId, number>([
        ['military_meritocracy', 95],
        ['noble_clans', 5],
        ['royal_kin', 50],
        ['reformists', 50],
        ['conservatives', 50],
        ['foreign_clients', 50],
      ]),
    }
    const world = makeWorld({
      ruler: makeRuler('tyrant'),
      realm: { politicalSystem: 'enfeoffment' as PoliticalSystem },
      factionInfluences: new Map([['realm_qin', initialInfluences]]),
      playerRealmId: 'realm_player_other',
    })

    expect(world.edicts.size).toBe(0)

    const result = factionPhase(world, RNG)

    expect(result.world.edicts.size).toBe(1)
    const newEdict = [...result.world.edicts.values()][0]!
    expect(newEdict.realmId).toBe('realm_qin')
    expect(newEdict.status).toBe('active')
    expect(newEdict.kind).toBe('edict_grain_reserve')
  })
})
