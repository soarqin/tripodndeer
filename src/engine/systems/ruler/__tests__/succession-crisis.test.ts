import { describe, expect, it } from 'vitest'

import { rulerLifecyclePhase } from '../ruler-lifecycle'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { M5_RULER_BASE_LIFESPAN } from '~/content/m2/balance'
import type {
  GameDate,
  General,
  GeneralId,
  Realm,
  RealmId,
  RulerState,
  SuccessionCrisisEvent,
  SuccessionResolvedEvent,
  World,
} from '~/shared/types'

const yearStart: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }
const rng = { seed: 42, counter: 0 }

function makeGeneral(id: GeneralId, realmId: RealmId, overrides: Partial<General> = {}): General {
  return {
    id,
    realmId,
    name: id,
    might: 50,
    command: 50,
    loyalty: 80,
    age: 35,
    attrs: { wu: 50, zheng: 50, jiao: 50, mou: 50, xue: 50, po: 50 },
    specialty: 'administrator',
    loyaltyState: 'loyal',
    ...overrides,
  }
}

function makeRuler(realmId: RealmId, overrides: Partial<RulerState> = {}): RulerState {
  return {
    realmId,
    generalId: `general_${realmId}`,
    age: 64,
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
    ...overrides,
  }
}

function makeRealm(id: RealmId, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#ffffff',
    capital: `site_${id}`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 1000, taxRate: 0.1 },
    rulerId: `general_${id}`,
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

function worldWith({
  rulers,
  generals,
  realms,
  playerRealmId = 'realm_qin',
}: {
  rulers: readonly RulerState[]
  generals?: readonly General[]
  realms?: readonly Realm[]
  playerRealmId?: RealmId
}): World {
  return makeEmptyWorld({
    date: yearStart,
    rulers: new Map(rulers.map((r) => [r.realmId, r])),
    generals: new Map((generals ?? []).map((g) => [g.id, g])),
    realms: new Map((realms ?? []).map((r) => [r.id, r])),
    playerRealmId,
  })
}

describe('succession crisis & resolution (rulerLifecyclePhase)', () => {
  it('AI realm with eligible heir auto-resolves: emits successionResolved event', () => {
    const realmId: RealmId = 'realm_zhao'
    const oldRulerGen = makeGeneral(`general_${realmId}`, realmId)
    const heir = makeGeneral('g_heir_zhao', realmId, { loyalty: 90 })
    const world = worldWith({
      playerRealmId: 'realm_qin',
      rulers: [makeRuler(realmId, { age: 64, lifespan: 65 })],
      generals: [oldRulerGen, heir],
      realms: [makeRealm(realmId)],
    })

    const result = rulerLifecyclePhase(world, rng)

    const types = result.events.map((e) => e.type)
    expect(types).toEqual(['rulerDied', 'successionResolved'])

    const resolved = result.events.find((e) => e.type === 'successionResolved') as
      | SuccessionResolvedEvent
      | undefined
    expect(resolved).toBeDefined()
    expect(resolved!.payload).toEqual({ realmId, newGeneralId: 'g_heir_zhao' })
  })

  it('AI realm with no eligible heir emits successionCrisis event', () => {
    const realmId: RealmId = 'realm_zhao'
    const oldRulerGen = makeGeneral(`general_${realmId}`, realmId)
    const world = worldWith({
      playerRealmId: 'realm_qin',
      rulers: [makeRuler(realmId, { age: 64, lifespan: 65 })],
      generals: [oldRulerGen],
      realms: [makeRealm(realmId)],
    })

    const result = rulerLifecyclePhase(world, rng)

    const types = result.events.map((e) => e.type)
    expect(types).toEqual(['rulerDied', 'successionCrisis'])

    const crisis = result.events.find((e) => e.type === 'successionCrisis') as
      | SuccessionCrisisEvent
      | undefined
    expect(crisis).toBeDefined()
    expect(crisis!.payload).toEqual({ realmId })
  })

  it('player realm always emits successionCrisis (UI-mediated), even with eligible heir', () => {
    const realmId: RealmId = 'realm_qin'
    const oldRulerGen = makeGeneral(`general_${realmId}`, realmId)
    const heir = makeGeneral('g_heir_qin', realmId, { loyalty: 95 })
    const world = worldWith({
      playerRealmId: 'realm_qin',
      rulers: [makeRuler(realmId, { age: 64, lifespan: 65 })],
      generals: [oldRulerGen, heir],
      realms: [makeRealm(realmId)],
    })

    const result = rulerLifecyclePhase(world, rng)

    const types = result.events.map((e) => e.type)
    expect(types).toEqual(['rulerDied', 'successionCrisis'])

    const resolvedEvents = result.events.filter((e) => e.type === 'successionResolved')
    expect(resolvedEvents).toHaveLength(0)

    expect(result.world.rulers.get(realmId)?.generalId).toBe(`general_${realmId}`)
    expect(result.world.realms.get(realmId)?.rulerId).toBe(`general_${realmId}`)
  })

  it('AI auto-resolution installs new RulerState with correct fields', () => {
    const realmId: RealmId = 'realm_zhao'
    const oldRulerGen = makeGeneral(`general_${realmId}`, realmId)
    const heir = makeGeneral('g_heir_zhao', realmId, {
      age: 38,
      loyalty: 90,
      specialty: 'commander',
    })
    const world = worldWith({
      playerRealmId: 'realm_qin',
      rulers: [
        makeRuler(realmId, {
          age: 64,
          lifespan: 65,
          personality: 'conqueror',
        }),
      ],
      generals: [oldRulerGen, heir],
      realms: [makeRealm(realmId)],
    })

    const result = rulerLifecyclePhase(world, rng)

    const newRuler = result.world.rulers.get(realmId)
    expect(newRuler).toBeDefined()
    expect(newRuler).toEqual({
      realmId,
      generalId: 'g_heir_zhao',
      age: 38,
      lifespan: M5_RULER_BASE_LIFESPAN,
      health: 100,
      personality: 'conqueror',
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
    })

    expect(result.world.realms.get(realmId)?.rulerId).toBe('g_heir_zhao')
    expect(result.world.generals.has(`general_${realmId}`)).toBe(false)
    expect(result.world.generals.has('g_heir_zhao')).toBe(true)
  })

  it('healthy AI ruler survives without succession events', () => {
    const realmId: RealmId = 'realm_zhao'
    const oldRulerGen = makeGeneral(`general_${realmId}`, realmId)
    const heir = makeGeneral('g_heir_zhao', realmId, { loyalty: 90 })
    const world = worldWith({
      playerRealmId: 'realm_qin',
      rulers: [makeRuler(realmId, { age: 40, lifespan: 65, health: 80 })],
      generals: [oldRulerGen, heir],
      realms: [makeRealm(realmId)],
    })

    const result = rulerLifecyclePhase(world, rng)

    expect(result.events).toEqual([])
    expect(result.world.rulers.get(realmId)?.generalId).toBe(`general_${realmId}`)
  })

  it('handles multiple ruler deaths in deterministic order (chu→qin→zhao)', () => {
    const playerRealmId: RealmId = 'realm_qin'
    const world = worldWith({
      playerRealmId,
      rulers: [
        makeRuler('realm_zhao', { age: 64, lifespan: 65 }),
        makeRuler('realm_chu', { age: 64, lifespan: 65 }),
        makeRuler(playerRealmId, { age: 64, lifespan: 65 }),
      ],
      generals: [
        makeGeneral('general_realm_zhao', 'realm_zhao'),
        makeGeneral('g_heir_zhao', 'realm_zhao', { loyalty: 90 }),
        makeGeneral('general_realm_chu', 'realm_chu'),
        makeGeneral('g_heir_chu', 'realm_chu', { loyalty: 90 }),
        makeGeneral(`general_${playerRealmId}`, playerRealmId),
      ],
      realms: [makeRealm('realm_zhao'), makeRealm('realm_chu'), makeRealm(playerRealmId)],
    })

    const result = rulerLifecyclePhase(world, rng)

    const sequence = result.events.map((e) => ({
      type: e.type,
      realmId: (e.payload as { realmId: string }).realmId,
    }))
    expect(sequence).toEqual([
      { type: 'rulerDied', realmId: 'realm_chu' },
      { type: 'successionResolved', realmId: 'realm_chu' },
      { type: 'rulerDied', realmId: 'realm_qin' },
      { type: 'successionCrisis', realmId: 'realm_qin' },
      { type: 'rulerDied', realmId: 'realm_zhao' },
      { type: 'successionResolved', realmId: 'realm_zhao' },
    ])
  })

  it('does not emit succession events outside year start', () => {
    const realmId: RealmId = 'realm_zhao'
    const midYear: GameDate = { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' }
    const world = makeEmptyWorld({
      date: midYear,
      playerRealmId: 'realm_qin',
      rulers: new Map([[realmId, makeRuler(realmId, { age: 64, lifespan: 65 })]]),
      generals: new Map([
        [`general_${realmId}`, makeGeneral(`general_${realmId}`, realmId)],
        ['g_heir_zhao', makeGeneral('g_heir_zhao', realmId, { loyalty: 90 })],
      ]),
      realms: new Map([[realmId, makeRealm(realmId)]]),
    })

    const result = rulerLifecyclePhase(world, rng)

    expect(result.events).toEqual([])
    expect(result.world).toBe(world)
  })
})
