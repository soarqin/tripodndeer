import { describe, expect, it } from 'vitest'

import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import {
  M42_FACTION_EVENT_PRIORITY,
  M42_FACTION_INFLUENCE_INITIAL,
} from '~/content/m2/balance'
import type {
  FactionId,
  FactionImbalanceEvent,
  FactionInfluenceState,
  General,
  Realm,
  RealmId,
  RNGState,
  RulerState,
  Site,
  SiteId,
  World,
} from '~/shared/types'

import { detectImbalanceEvents, getDefaultImbalanceEvents } from '../imbalance-detection'

const RNG: RNGState = { seed: 42, counter: 0 }
const REALM_ID: RealmId = 'realm_qin'

function makeRealm(overrides: Partial<Realm> = {}): Realm {
  return {
    id: REALM_ID,
    displayName: 'Qin',
    fullTitle: 'Qin',
    color: '#ff0000',
    capital: 'site_capital',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 1000, foodStores: 500, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function makeSite(id: SiteId, ownerId: RealmId | null): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 100, households: 25, taxBase: 50, foodProduction: 30 },
  }
}

function makeRuler(generalId: string, overrides: Partial<RulerState> = {}): RulerState {
  return {
    realmId: REALM_ID,
    generalId,
    age: 30,
    lifespan: 60,
    health: 100,
    personality: 'benevolent',
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
    ...overrides,
  }
}

function makeGeneral(
  id: string,
  faction: FactionId | undefined,
  overrides: Partial<General> = {},
): General {
  return {
    id,
    realmId: REALM_ID,
    name: id,
    might: 50,
    command: 50,
    loyalty: 80,
    faction,
    ...overrides,
  }
}

function makeInfluenceState(values: Partial<Record<FactionId, number>>): FactionInfluenceState {
  const influences = new Map<FactionId, number>([
    ['royal_kin', M42_FACTION_INFLUENCE_INITIAL],
    ['noble_clans', M42_FACTION_INFLUENCE_INITIAL],
    ['military_meritocracy', M42_FACTION_INFLUENCE_INITIAL],
    ['reformists', M42_FACTION_INFLUENCE_INITIAL],
    ['conservatives', M42_FACTION_INFLUENCE_INITIAL],
    ['foreign_clients', M42_FACTION_INFLUENCE_INITIAL],
  ])
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined) influences.set(k as FactionId, v)
  }
  return { realmId: REALM_ID, influences }
}

function makeWorld(opts: {
  realm?: Partial<Realm>
  ruler?: RulerState | null
  generals?: General[]
  factionInfluences?: ReadonlyMap<RealmId, FactionInfluenceState>
  sites?: Site[]
} = {}): World {
  const realm = makeRealm(opts.realm)
  const generalsMap = new Map<string, General>()
  for (const g of opts.generals ?? []) {
    generalsMap.set(g.id, g)
  }
  const rulers = new Map<string, RulerState>()
  if (opts.ruler !== null) {
    rulers.set(realm.id, opts.ruler ?? makeRuler('gen_ruler'))
  }
  const sitesMap = new Map<string, Site>()
  for (const s of opts.sites ?? []) {
    sitesMap.set(s.id, s)
  }
  return makeEmptyWorld({
    realms: new Map([[realm.id, realm]]),
    rulers,
    generals: generalsMap,
    sites: sitesMap,
    factionInfluences: opts.factionInfluences ?? new Map(),
    playerRealmId: realm.id,
  })
}

describe('detectImbalanceEvents: threshold gating', () => {
  it('returns no events when imbalance is below threshold', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ royal_kin: 80, conservatives: 20 })],
      ]),
    })
    const result = detectImbalanceEvents(world, RNG)
    expect(result.gameEvents).toHaveLength(0)
    expect(result.world).toBe(world)
  })

  it('returns no events when imbalance is exactly at threshold (70)', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ royal_kin: 90, conservatives: 20 })],
      ]),
    })
    const result = detectImbalanceEvents(world, RNG)
    expect(result.gameEvents).toHaveLength(0)
  })

  it('triggers an event when imbalance > 70 (max-min difference)', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      generals: [makeGeneral('gen_dom', 'military_meritocracy')],
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
    })
    const result = detectImbalanceEvents(world, RNG)
    expect(result.gameEvents.length).toBeGreaterThanOrEqual(1)
  })
})

describe('detectImbalanceEvents: priority ordering', () => {
  it('coup wins when all three predicates are satisfied', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      generals: [makeGeneral('gen_dom', 'military_meritocracy')],
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
      sites: [makeSite('site_a', REALM_ID), makeSite('site_b', REALM_ID)],
    })
    const result = detectImbalanceEvents(world, RNG)
    const imbalanceEvent = result.gameEvents.find((e) => e.type === 'factionImbalance')
    expect(imbalanceEvent).toBeDefined()
    const payload = imbalanceEvent!.payload as { eventKind: string }
    expect(payload.eventKind).toBe('coup')
  })

  it('priority order matches M42_FACTION_EVENT_PRIORITY: coup, split, overthrow', () => {
    expect(M42_FACTION_EVENT_PRIORITY).toEqual(['coup', 'split', 'overthrow'])
    const events = getDefaultImbalanceEvents()
    expect(events.length).toBe(3)
    const kinds = new Set(events.map((e) => e.kind))
    expect(kinds.has('coup')).toBe(true)
    expect(kinds.has('split')).toBe(true)
    expect(kinds.has('overthrow')).toBe(true)
  })

  it('split triggers when only split predicate is satisfied (coup filtered out)', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
      sites: [makeSite('site_a', REALM_ID), makeSite('site_b', REALM_ID)],
    })
    const customEvents: FactionImbalanceEvent[] = [
      {
        id: 'coup_disabled',
        kind: 'coup',
        triggerPredicate: { kind: 'realm.id', value: 'never' },
        effects: [],
        cooldownYears: 5,
        displayNameZh: '',
      },
      {
        id: 'split_enabled',
        kind: 'split',
        triggerPredicate: { kind: 'and', children: [] },
        effects: [],
        cooldownYears: 5,
        displayNameZh: '',
      },
    ]
    const result = detectImbalanceEvents(world, RNG, customEvents)
    const imbalanceEvent = result.gameEvents.find((e) => e.type === 'factionImbalance')
    expect(imbalanceEvent).toBeDefined()
    const payload = imbalanceEvent!.payload as { eventKind: string }
    expect(payload.eventKind).toBe('split')
  })

  it('overthrow triggers when only overthrow predicate is satisfied', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      generals: [makeGeneral('gen_dom', 'military_meritocracy')],
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
    })
    const customEvents: FactionImbalanceEvent[] = [
      {
        id: 'coup_disabled',
        kind: 'coup',
        triggerPredicate: { kind: 'realm.id', value: 'never' },
        effects: [],
        cooldownYears: 5,
        displayNameZh: '',
      },
      {
        id: 'split_disabled',
        kind: 'split',
        triggerPredicate: { kind: 'realm.id', value: 'never' },
        effects: [],
        cooldownYears: 5,
        displayNameZh: '',
      },
      {
        id: 'overthrow_enabled',
        kind: 'overthrow',
        triggerPredicate: { kind: 'and', children: [] },
        effects: [],
        cooldownYears: 5,
        displayNameZh: '',
      },
    ]
    const result = detectImbalanceEvents(world, RNG, customEvents)
    const imbalanceEvent = result.gameEvents.find((e) => e.type === 'factionImbalance')
    expect(imbalanceEvent).toBeDefined()
    const payload = imbalanceEvent!.payload as { eventKind: string }
    expect(payload.eventKind).toBe('overthrow')
  })
})

describe('detectImbalanceEvents: event uniqueness', () => {
  it('emits at most one factionImbalance event per realm per tick', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      generals: [makeGeneral('gen_dom', 'military_meritocracy')],
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
    })
    const result = detectImbalanceEvents(world, RNG)
    const imbalanceEvents = result.gameEvents.filter((e) => e.type === 'factionImbalance')
    expect(imbalanceEvents).toHaveLength(1)
  })
})

describe('detectImbalanceEvents: coup mechanics', () => {
  it('replaces ruler generalId with the dominant faction general', () => {
    const ruler = makeRuler('gen_old_ruler')
    const world = makeWorld({
      ruler,
      generals: [
        makeGeneral('gen_old_ruler', 'royal_kin'),
        makeGeneral('gen_coup_leader', 'military_meritocracy'),
      ],
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
    })
    const result = detectImbalanceEvents(world, RNG)
    const newRuler = result.world.rulers.get(REALM_ID)
    expect(newRuler).toBeDefined()
    expect(newRuler!.generalId).toBe('gen_coup_leader')
  })

  it('does not change ruler when no general from dominant faction exists', () => {
    const ruler = makeRuler('gen_old_ruler')
    const world = makeWorld({
      ruler,
      generals: [makeGeneral('gen_old_ruler', 'royal_kin')],
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
    })
    const result = detectImbalanceEvents(world, RNG)
    const newRuler = result.world.rulers.get(REALM_ID)
    expect(newRuler!.generalId).toBe('gen_old_ruler')
  })
})

describe('detectImbalanceEvents: split mechanics', () => {
  it('split kind invokes splitRealm and grows the realms map', () => {
    const customEvents: FactionImbalanceEvent[] = [
      {
        id: 'split_only',
        kind: 'split',
        triggerPredicate: { kind: 'and', children: [] },
        effects: [],
        cooldownYears: 5,
        displayNameZh: '',
      },
    ]
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
      sites: [
        makeSite('site_a', REALM_ID),
        makeSite('site_b', REALM_ID),
        makeSite('site_c', REALM_ID),
        makeSite('site_d', REALM_ID),
      ],
    })
    expect(world.realms.size).toBe(1)
    const result = detectImbalanceEvents(world, RNG, customEvents)
    expect(result.world.realms.size).toBeGreaterThan(1)
    expect(
      result.gameEvents.some((e) => e.type === 'realmSplit'),
    ).toBe(true)
  })

  it('skips split when realm has fewer than 2 sites', () => {
    const customEvents: FactionImbalanceEvent[] = [
      {
        id: 'split_only',
        kind: 'split',
        triggerPredicate: { kind: 'and', children: [] },
        effects: [],
        cooldownYears: 5,
        displayNameZh: '',
      },
    ]
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
      sites: [makeSite('site_a', REALM_ID)],
    })
    const result = detectImbalanceEvents(world, RNG, customEvents)
    expect(result.world.realms.size).toBe(1)
    expect(result.gameEvents.some((e) => e.type === 'realmSplit')).toBe(false)
    expect(result.gameEvents.filter((e) => e.type === 'factionImbalance')).toHaveLength(1)
  })
})

describe('detectImbalanceEvents: skip conditions', () => {
  it('skips realm with no factionInfluences entry', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      factionInfluences: new Map(),
    })
    const result = detectImbalanceEvents(world, RNG)
    expect(result.gameEvents).toHaveLength(0)
  })

  it('skips realm with balanced factions (imbalance <= 70)', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      factionInfluences: new Map([
        [
          REALM_ID,
          makeInfluenceState({
            royal_kin: 60,
            noble_clans: 50,
            military_meritocracy: 50,
            reformists: 40,
            conservatives: 50,
            foreign_clients: 50,
          }),
        ],
      ]),
    })
    const result = detectImbalanceEvents(world, RNG)
    expect(result.gameEvents).toHaveLength(0)
  })

  it('skips realms whose factionInfluences map has empty values', () => {
    const emptyState: FactionInfluenceState = {
      realmId: REALM_ID,
      influences: new Map(),
    }
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      factionInfluences: new Map([[REALM_ID, emptyState]]),
    })
    const result = detectImbalanceEvents(world, RNG)
    expect(result.gameEvents).toHaveLength(0)
  })
})

describe('detectImbalanceEvents: dominant faction identification', () => {
  it('coup payload reports the highest-influence faction as dominant', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      generals: [makeGeneral('gen_x', 'foreign_clients')],
      factionInfluences: new Map([
        [
          REALM_ID,
          makeInfluenceState({
            royal_kin: 10,
            noble_clans: 20,
            military_meritocracy: 30,
            reformists: 40,
            conservatives: 15,
            foreign_clients: 95,
          }),
        ],
      ]),
    })
    const result = detectImbalanceEvents(world, RNG)
    const imbalanceEvent = result.gameEvents.find((e) => e.type === 'factionImbalance')
    expect(imbalanceEvent).toBeDefined()
    const payload = imbalanceEvent!.payload as { dominantFaction: FactionId }
    expect(payload.dominantFaction).toBe('foreign_clients')
  })
})

describe('detectImbalanceEvents: determinism', () => {
  it('does not advance RNG state', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      generals: [makeGeneral('gen_dom', 'military_meritocracy')],
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
    })
    const rng: RNGState = { seed: 12345, counter: 7 }
    const result = detectImbalanceEvents(world, rng)
    expect(result.nextRng).toBe(rng)
  })

  it('produces a stable kind across two identical runs', () => {
    const world = makeWorld({
      ruler: makeRuler('gen_ruler'),
      generals: [makeGeneral('gen_dom', 'military_meritocracy')],
      factionInfluences: new Map([
        [REALM_ID, makeInfluenceState({ military_meritocracy: 95, conservatives: 10 })],
      ]),
    })
    const r1 = detectImbalanceEvents(world, RNG)
    const r2 = detectImbalanceEvents(world, RNG)
    const k1 = (r1.gameEvents.find((e) => e.type === 'factionImbalance')!.payload as {
      eventKind: string
    }).eventKind
    const k2 = (r2.gameEvents.find((e) => e.type === 'factionImbalance')!.payload as {
      eventKind: string
    }).eventKind
    expect(k1).toBe(k2)
  })
})
