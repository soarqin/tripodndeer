import { describe, expect, it, vi } from 'vitest'
import type {
  Realm,
  RNGState,
  RulerState,
  Site,
  Treaty,
  World,
  ZhouInvestitureState,
} from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { prestigeUpdatePhase } from '../prestige-update-phase'

const RNG: RNGState = { seed: 1, counter: 0 }

const yearEnd = { yearBC: 260, season: 'winter', month: 3, xun: 'xia' } as const
const midYear = { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' } as const

function makeRealm(id: string, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000',
    capital: 'site_capital',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 0, foodStores: 0, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
    ...overrides,
  }
}

function makeRuler(realmId: string, personality: RulerState['personality']): RulerState {
  return {
    realmId,
    generalId: `gen_${realmId}_ruler`,
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

function makeInvestiture(
  realmId: string,
  rank: ZhouInvestitureState['rank'],
): ZhouInvestitureState {
  return {
    realmId,
    recognizedTitle: rank ?? 'baron',
    grantedAtTick: 0,
    expiresAtTick: null,
    source: 'zhou',
    rank,
  }
}

function makeTreaty(
  id: string,
  realmAId: string,
  realmBId: string,
  kind: Treaty['kind'] = 'alliance',
): Treaty {
  return {
    id,
    kind,
    realmAId,
    realmBId,
    status: 'active',
    signedAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    signedAtTick: 0,
    expiresAt: null,
    expiresAtTick: null,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: null,
  }
}

describe('prestigeUpdatePhase', () => {
  it('triggers at year-end (winter/3/xia)', () => {
    const realm = makeRealm('realm_qin', { prestige: 40, warVictoriesThisYear: 4 })
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([[realm.id, realm]]),
    })

    const result = prestigeUpdatePhase(world, RNG)
    const updated = result.world.realms.get(realm.id)!
    expect(updated.prestige).toBeGreaterThan(40)
  })

  it('does NOT trigger mid-year', () => {
    const realm = makeRealm('realm_qin', { prestige: 40, warVictoriesThisYear: 4 })
    const world: World = makeEmptyWorld({
      date: midYear,
      realms: new Map([[realm.id, realm]]),
    })

    const result = prestigeUpdatePhase(world, RNG)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })

  it('Zhou investiture rank boosts prestige (duke > baron)', () => {
    const dukeRealm = makeRealm('realm_qi', { prestige: 40 })
    const baronRealm = makeRealm('realm_zheng', { prestige: 40 })
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([
        [dukeRealm.id, dukeRealm],
        [baronRealm.id, baronRealm],
      ]),
      zhouInvestiture: new Map([
        [dukeRealm.id, makeInvestiture(dukeRealm.id, 'duke')],
        [baronRealm.id, makeInvestiture(baronRealm.id, 'baron')],
      ]),
    })

    const result = prestigeUpdatePhase(world, RNG)
    const dukeAfter = result.world.realms.get(dukeRealm.id)!
    const baronAfter = result.world.realms.get(baronRealm.id)!
    expect(dukeAfter.prestige!).toBeGreaterThan(baronAfter.prestige!)
  })

  it('war victories boost prestige', () => {
    const winner = makeRealm('realm_qin', { prestige: 40, warVictoriesThisYear: 6 })
    const idle = makeRealm('realm_chu', { prestige: 40, warVictoriesThisYear: 0 })
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([
        [winner.id, winner],
        [idle.id, idle],
      ]),
    })

    const result = prestigeUpdatePhase(world, RNG)
    expect(result.world.realms.get(winner.id)!.prestige!).toBeGreaterThan(
      result.world.realms.get(idle.id)!.prestige!,
    )
  })

  it('resets warVictoriesThisYear to 0 after computing', () => {
    const realm = makeRealm('realm_qin', { prestige: 40, warVictoriesThisYear: 7 })
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([[realm.id, realm]]),
    })

    const result = prestigeUpdatePhase(world, RNG)
    expect(result.world.realms.get(realm.id)!.warVictoriesThisYear).toBe(0)
  })

  it('benevolent ruler contributes ritual prestige', () => {
    const realm = makeRealm('realm_lu', { prestige: 30 })
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([[realm.id, realm]]),
      rulers: new Map([[realm.id, makeRuler(realm.id, 'benevolent')]]),
    })

    const result = prestigeUpdatePhase(world, RNG)
    expect(result.world.realms.get(realm.id)!.prestige!).toBeGreaterThan(30)
  })

  it('alliances contribute prestige', () => {
    const a = makeRealm('realm_qin', { prestige: 40 })
    const b = makeRealm('realm_chu', { prestige: 40 })
    const c = makeRealm('realm_zhao', { prestige: 40 })
    const d = makeRealm('realm_wei', { prestige: 40 })
    const isolated = makeRealm('realm_yan', { prestige: 40 })
    const treaties = new Map([
      ['treaty_ab', makeTreaty('treaty_ab', a.id, b.id)],
      ['treaty_ac', makeTreaty('treaty_ac', a.id, c.id)],
      ['treaty_ad', makeTreaty('treaty_ad', a.id, d.id)],
    ])
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([
        [a.id, a],
        [b.id, b],
        [c.id, c],
        [d.id, d],
        [isolated.id, isolated],
      ]),
      treaties,
    })

    const result = prestigeUpdatePhase(world, RNG)
    expect(result.world.realms.get(a.id)!.prestige!).toBeGreaterThan(
      result.world.realms.get(isolated.id)!.prestige!,
    )
  })

  it('cultural identity boosts prestige via diffusion source', () => {
    const realm = makeRealm('realm_qin', { prestige: 40 })
    const sites = new Map<string, Site>([
      [
        'site_a',
        {
          id: 'site_a',
          name: 'a',
          position: [0, 0],
          boundary: [],
          ownerId: realm.id,
          polygon: [],
          adjacency: [],
          economy: { population: 100, households: 100, taxBase: 100, foodProduction: 100 },
          cultural: 'chinese_qin',
          culturalIdentityStrength: 100,
        } as Site,
      ],
    ])
    const world: World = makeEmptyWorld({
      date: yearEnd,
      sites,
      realms: new Map([[realm.id, realm]]),
    })

    const result = prestigeUpdatePhase(world, RNG)
    expect(result.world.realms.get(realm.id)!.prestige!).toBeGreaterThan(40)
  })

  it('clamps prestige to 0-100 range', () => {
    const realm = makeRealm('realm_qin', { prestige: 99, warVictoriesThisYear: 100 })
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([[realm.id, realm]]),
    })

    const result = prestigeUpdatePhase(world, RNG)
    expect(result.world.realms.get(realm.id)!.prestige!).toBeLessThanOrEqual(100)
    expect(result.world.realms.get(realm.id)!.prestige!).toBeGreaterThanOrEqual(0)
  })

  it('emits prestigeUpdated event when delta exceeds threshold', () => {
    const realm = makeRealm('realm_qin', { prestige: 40, warVictoriesThisYear: 30 })
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([[realm.id, realm]]),
    })

    const result = prestigeUpdatePhase(world, RNG)
    expect(result.events.some((e) => e.type === 'prestigeUpdated')).toBe(true)
  })

  it('is deterministic (same input → same output)', () => {
    const realm = makeRealm('realm_qin', { prestige: 40, warVictoriesThisYear: 5 })
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([[realm.id, realm]]),
      rulers: new Map([[realm.id, makeRuler(realm.id, 'benevolent')]]),
    })

    const a = prestigeUpdatePhase(world, RNG)
    const b = prestigeUpdatePhase(world, RNG)
    expect(a.world.realms.get(realm.id)?.prestige).toBe(
      b.world.realms.get(realm.id)?.prestige,
    )
    expect(a.events).toEqual(b.events)
  })

  it('returns world unchanged when M6_ENABLED is false', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M6_ENABLED: false }
    })

    const { prestigeUpdatePhase: phase } = await import('../prestige-update-phase')
    const realm = makeRealm('realm_qin', { warVictoriesThisYear: 5 })
    const world: World = makeEmptyWorld({
      date: yearEnd,
      realms: new Map([[realm.id, realm]]),
    })

    const result = phase(world, RNG)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })
})
