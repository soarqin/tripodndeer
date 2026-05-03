import { describe, expect, it, vi } from 'vitest'
import type {
  CulturalTag,
  GameDate,
  PeaceProposal,
  Realm,
  RNGState,
  Site,
  SiteId,
  Treaty,
  World,
} from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import {
  M6_CULTURAL_CHINESE_TO_CHINESE_YEARS,
  M6_CULTURAL_CONQUEST_DROP,
  M6_CULTURAL_DRIFT_PER_TICK,
  M6_TRIBUTE_CULTURAL_PULL_PER_YEAR,
} from '~/content/m2/balance'
import { culturalIdentityPhase } from '../cultural-identity-phase'

const RNG: RNGState = { seed: 1, counter: 0 }
const TICKS_PER_YEAR = 36
const DATE: GameDate = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' }

interface SiteFixture {
  id: SiteId
  ownerId: string | null
  cultural: CulturalTag
  identity: number
  adjacency?: readonly SiteId[]
  lastConquestTick?: number | null
  lowIdentitySinceTick?: number | null
}

function makeSite(opts: SiteFixture): Site {
  return {
    id: opts.id,
    name: opts.id,
    position: [0, 0],
    boundary: [],
    ownerId: opts.ownerId,
    polygon: [],
    adjacency: opts.adjacency ?? [],
    economy: { population: 100, households: 100, taxBase: 100, foodProduction: 100 },
    cultural: opts.cultural,
    culturalIdentityStrength: opts.identity,
    lastConquestTick: opts.lastConquestTick ?? null,
    lowIdentitySinceTick: opts.lowIdentitySinceTick ?? null,
  } as Site
}

function makeRealm(id: string): Realm {
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
  }
}

function makeSitesMap(sites: readonly Site[]): ReadonlyMap<SiteId, Site> {
  return new Map(sites.map((s) => [s.id, s]))
}

describe('culturalIdentityPhase — diffusion and conquest', () => {
  it('keeps identity stable when all neighbours share the same cultural tag', () => {
    const sites = makeSitesMap([
      makeSite({
        id: 'site_a',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 80,
        adjacency: ['site_b'],
      }),
      makeSite({
        id: 'site_b',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 90,
        adjacency: ['site_a'],
      }),
    ])
    const world: World = makeEmptyWorld({ sites })

    const result = culturalIdentityPhase(world, RNG)

    expect(result.world.sites.get('site_a')?.culturalIdentityStrength).toBe(80)
    expect(result.world.sites.get('site_b')?.culturalIdentityStrength).toBe(90)
    expect(result.events).toHaveLength(0)
  })

  it('drops identity by drift constant per different-cultural neighbour', () => {
    const sites = makeSitesMap([
      makeSite({
        id: 'site_a',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 80,
        adjacency: ['site_b'],
      }),
      makeSite({
        id: 'site_b',
        ownerId: 'realm_chu',
        cultural: 'chinese_chu',
        identity: 80,
        adjacency: ['site_a'],
      }),
    ])
    const world: World = makeEmptyWorld({ sites })

    const result = culturalIdentityPhase(world, RNG)

    const a = result.world.sites.get('site_a')!
    const b = result.world.sites.get('site_b')!
    expect(a.culturalIdentityStrength).toBeCloseTo(80 - M6_CULTURAL_DRIFT_PER_TICK, 5)
    expect(b.culturalIdentityStrength).toBeCloseTo(80 - M6_CULTURAL_DRIFT_PER_TICK, 5)
  })

  it('applies conquest drop when site was conquered last tick', () => {
    const sites = makeSitesMap([
      makeSite({
        id: 'site_a',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 100,
        lastConquestTick: 9,
      }),
    ])
    const world: World = makeEmptyWorld({ sites, tick: 10 })

    const result = culturalIdentityPhase(world, RNG)

    expect(result.world.sites.get('site_a')?.culturalIdentityStrength).toBe(
      100 - M6_CULTURAL_CONQUEST_DROP,
    )
  })

  it('flips cultural tag after Chinese↔Chinese threshold time at low identity', () => {
    const flipTick = M6_CULTURAL_CHINESE_TO_CHINESE_YEARS * TICKS_PER_YEAR
    const sites = makeSitesMap([
      makeSite({
        id: 'site_a',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 5,
        adjacency: ['site_b'],
        lowIdentitySinceTick: 0,
      }),
      makeSite({
        id: 'site_b',
        ownerId: 'realm_chu',
        cultural: 'chinese_chu',
        identity: 100,
        adjacency: ['site_a'],
      }),
    ])
    const world: World = makeEmptyWorld({ sites, tick: flipTick })

    const result = culturalIdentityPhase(world, RNG)

    const flipped = result.world.sites.get('site_a')!
    expect(flipped.cultural).toBe('chinese_chu')
    expect(flipped.lowIdentitySinceTick).toBeNull()
    expect(result.events.some((e) => e.type === 'culturalTagFlipped')).toBe(true)
  })

})

describe('culturalIdentityPhase — tribute and feature flag', () => {
  it('pulls tributary site identity toward suzerain culture via active treaty', () => {
    const realmTributary = makeRealm('realm_han')
    const realmSuzerain = makeRealm('realm_qin')
    const tributarySite = makeSite({
      id: 'site_tributary',
      ownerId: realmTributary.id,
      cultural: 'chinese_han',
      identity: 80,
    })
    const suzerainSite = makeSite({
      id: 'site_suzerain',
      ownerId: realmSuzerain.id,
      cultural: 'chinese_qin',
      identity: 100,
    })
    const treaty: Treaty = {
      id: 'treaty_tribute_1',
      kind: 'tribute',
      realmAId: realmTributary.id,
      realmBId: realmSuzerain.id,
      status: 'active',
      signedAt: DATE,
      signedAtTick: 0,
      expiresAt: null,
      expiresAtTick: null,
      endedAt: null,
      endedAtTick: null,
      sourceProposalId: null,
    }
    const world: World = makeEmptyWorld({
      sites: makeSitesMap([tributarySite, suzerainSite]),
      realms: new Map([
        [realmTributary.id, realmTributary],
        [realmSuzerain.id, realmSuzerain],
      ]),
      treaties: new Map([[treaty.id, treaty]]),
    })

    const result = culturalIdentityPhase(world, RNG)

    const expectedPullPerTick = M6_TRIBUTE_CULTURAL_PULL_PER_YEAR / TICKS_PER_YEAR
    const tributaryAfter = result.world.sites.get('site_tributary')!
    const suzerainAfter = result.world.sites.get('site_suzerain')!
    expect(tributaryAfter.culturalIdentityStrength).toBeCloseTo(80 - expectedPullPerTick, 5)
    expect(suzerainAfter.culturalIdentityStrength).toBe(100)
  })

  it('returns world unchanged when M6_ENABLED is false', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M6_ENABLED: false }
    })

    const { culturalIdentityPhase: phaseDisabled } = await import(
      '../cultural-identity-phase'
    )
    const sites = makeSitesMap([
      makeSite({
        id: 'site_a',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 80,
        adjacency: ['site_b'],
      }),
      makeSite({
        id: 'site_b',
        ownerId: 'realm_chu',
        cultural: 'chinese_chu',
        identity: 80,
        adjacency: ['site_a'],
      }),
    ])
    const world: World = makeEmptyWorld({ sites })

    const result = phaseDisabled(world, RNG)

    expect(result.world).toBe(world)
    expect(result.events).toEqual([])

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })

  it('is deterministic for the same input', () => {
    const buildWorld = (): World =>
      makeEmptyWorld({
        sites: makeSitesMap([
          makeSite({
            id: 'site_a',
            ownerId: 'realm_qin',
            cultural: 'chinese_qin',
            identity: 50,
            adjacency: ['site_b'],
          }),
          makeSite({
            id: 'site_b',
            ownerId: 'realm_chu',
            cultural: 'chinese_chu',
            identity: 50,
            adjacency: ['site_a'],
          }),
        ]),
      })

    const a = culturalIdentityPhase(buildWorld(), RNG)
    const b = culturalIdentityPhase(buildWorld(), RNG)
    expect(a.world.sites.get('site_a')?.culturalIdentityStrength).toBe(
      b.world.sites.get('site_a')?.culturalIdentityStrength,
    )
    expect(a.world.sites.get('site_b')?.culturalIdentityStrength).toBe(
      b.world.sites.get('site_b')?.culturalIdentityStrength,
    )
    expect(a.events).toEqual(b.events)
  })

  it('does not flip when low identity has not lasted long enough', () => {
    const halfFlipTick = (M6_CULTURAL_CHINESE_TO_CHINESE_YEARS / 2) * TICKS_PER_YEAR
    const sites = makeSitesMap([
      makeSite({
        id: 'site_a',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 5,
        adjacency: ['site_b'],
        lowIdentitySinceTick: 0,
      }),
      makeSite({
        id: 'site_b',
        ownerId: 'realm_chu',
        cultural: 'chinese_chu',
        identity: 100,
        adjacency: ['site_a'],
      }),
    ])
    const world: World = makeEmptyWorld({ sites, tick: halfFlipTick })

    const result = culturalIdentityPhase(world, RNG)

    expect(result.world.sites.get('site_a')?.cultural).toBe('chinese_qin')
    expect(result.events.some((e) => e.type === 'culturalTagFlipped')).toBe(false)
  })

})

describe('culturalIdentityPhase — tracker and adjacency', () => {
  it('clears low-identity tracker when identity recovers above threshold', () => {
    const sites = makeSitesMap([
      makeSite({
        id: 'site_a',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 80,
        adjacency: [],
        lowIdentitySinceTick: 100,
      }),
    ])
    const world: World = makeEmptyWorld({ sites, tick: 200 })

    const result = culturalIdentityPhase(world, RNG)

    expect(result.world.sites.get('site_a')?.lowIdentitySinceTick).toBeNull()
  })

  it('starts low-identity tracker when identity first drops below threshold', () => {
    const sites = makeSitesMap([
      makeSite({
        id: 'site_a',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 25,
        adjacency: ['site_b'],
        lowIdentitySinceTick: null,
      }),
      makeSite({
        id: 'site_b',
        ownerId: 'realm_chu',
        cultural: 'chinese_chu',
        identity: 100,
        adjacency: ['site_a'],
      }),
    ])
    const world: World = makeEmptyWorld({ sites, tick: 500 })

    const result = culturalIdentityPhase(world, RNG)

    expect(result.world.sites.get('site_a')?.lowIdentitySinceTick).toBe(500)
  })

  it('uses world.adjacencyEdges-free site.adjacency for diffusion', () => {
    const sites = makeSitesMap([
      makeSite({
        id: 'site_a',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 80,
        adjacency: ['site_b'],
      }),
      makeSite({
        id: 'site_b',
        ownerId: 'realm_chu',
        cultural: 'chinese_chu',
        identity: 80,
        adjacency: ['site_a'],
      }),
      makeSite({
        id: 'site_c',
        ownerId: 'realm_yan',
        cultural: 'chinese_yan',
        identity: 80,
        adjacency: [],
      }),
    ])
    const world: World = makeEmptyWorld({ sites })

    const result = culturalIdentityPhase(world, RNG)

    expect(result.world.sites.get('site_c')?.culturalIdentityStrength).toBe(80)
    expect(result.world.sites.get('site_a')?.culturalIdentityStrength).toBeCloseTo(
      80 - M6_CULTURAL_DRIFT_PER_TICK,
      5,
    )
  })

  it('does not pull suzerain sites — only tributary sites are affected', () => {
    const proposal: PeaceProposal = {
      id: 'prop_tribute_only',
      proposingRealmId: 'realm_qin',
      targetRealmId: 'realm_han',
      terms: [{ type: 'tribute', payload: { amountPerYear: 100, years: 5 } }],
      proposedAt: DATE,
      status: 'accepted',
      acknowledgedAt: DATE,
    }
    const sites = makeSitesMap([
      makeSite({
        id: 'site_qin',
        ownerId: 'realm_qin',
        cultural: 'chinese_qin',
        identity: 100,
      }),
      makeSite({
        id: 'site_han',
        ownerId: 'realm_han',
        cultural: 'chinese_han',
        identity: 100,
      }),
    ])
    const world: World = makeEmptyWorld({
      sites,
      peaceProposals: new Map([[proposal.id, proposal]]),
    })

    const result = culturalIdentityPhase(world, RNG)

    expect(result.world.sites.get('site_qin')?.culturalIdentityStrength).toBe(100)
    expect(result.world.sites.get('site_han')?.culturalIdentityStrength).toBeLessThan(100)
  })
})
