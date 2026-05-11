/* eslint-disable max-lines-per-function */
import { describe, expect, it, vi } from 'vitest'
import {
  M6_CULTURAL_CHINESE_TO_CHINESE_YEARS,
  M6_CULTURAL_CHINESE_TO_BARBARIAN_YEARS,
} from '~/content/m2/balance'
import { culturalIdentityPhase } from '~/engine/systems/culture/cultural-identity-phase'
import { ideologyDriftPhase } from '~/engine/systems/culture/ideology-drift-phase'
import { prestigeUpdatePhase } from '~/engine/systems/culture/prestige-update-phase'
import { recruitmentPhase } from '~/engine/systems/recruitment/recruitment'
import { applyEventEffect } from '~/engine/systems/events/event-chain-engine'
import { evaluatePredicate } from '~/engine/systems/reform/predicate'
import { splitRealm } from '~/engine/systems/ruler/realm-split'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  Academy,
  General,
  PredicateNode,
  Realm,
  RealmId,
  RNGState,
  RulerState,
  Site,
  SiteId,
  Treaty,
  World,
  ZhouInvestitureState,
} from '~/shared/types'

const RNG: RNGState = { seed: 42, counter: 0 }
const TICKS_PER_YEAR = 36

const yearStart = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' } as const
const yearEnd = { yearBC: 260, season: 'winter', month: 3, xun: 'xia' } as const

function makeRealm(id: RealmId, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 1000, foodStores: 1000, taxRate: 0.1 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
    ...overrides,
  }
}

function makeRuler(realmId: RealmId, personality: RulerState['personality']): RulerState {
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

function makeAcademy(overrides: Partial<Academy> = {}): Academy {
  return {
    id: 'academy_jixia',
    hostRealmId: 'realm_qi',
    hostSiteId: 'site_qi_capital',
    primaryIdeology: 'ru',
    secondaryIdeology: 'dao',
    founded: 318,
    level: 1,
    status: 'active',
    ...overrides,
  }
}

function makeSite(opts: {
  id: SiteId
  ownerId: RealmId | null
  cultural?: Site['cultural']
  identity?: number
  adjacency?: readonly SiteId[]
  lastConquestTick?: number | null
  lowIdentitySinceTick?: number | null
}): Site {
  return {
    id: opts.id,
    name: opts.id,
    position: [0, 0],
    boundary: [],
    ownerId: opts.ownerId,
    polygon: [],
    adjacency: opts.adjacency ?? [],
    economy: { population: 100, households: 100, taxBase: 100, foodProduction: 100 },
    cultural: opts.cultural ?? 'chinese_qin',
    culturalIdentityStrength: opts.identity ?? 100,
    lastConquestTick: opts.lastConquestTick ?? null,
    lowIdentitySinceTick: opts.lowIdentitySinceTick ?? null,
  }
}

function makeTributeTreaty(
  id: string,
  tributaryRealmId: RealmId,
  suzerainRealmId: RealmId,
): Treaty {
  return {
    id,
    kind: 'tribute',
    realmAId: tributaryRealmId,
    realmBId: suzerainRealmId,
    status: 'active',
    signedAt: yearStart,
    signedAtTick: 0,
    expiresAt: null,
    expiresAtTick: null,
    endedAt: null,
    endedAtTick: null,
    sourceProposalId: null,
  }
}

describe('M6 integration edge cases', () => {
  describe('EC1: Academy dormant → recruitmentPhase produces no talent from it', () => {
    it('dormant academy is skipped while wild recruitment still runs', () => {
      const realm = makeRealm('realm_qi')
      const academy = makeAcademy({ status: 'dormant' })
      const world = makeEmptyWorld({
        date: yearStart,
        realms: new Map([[realm.id, realm]]),
        academies: new Map([[academy.id, academy]]),
      })

      const result = recruitmentPhase(world, world.rngState)

      const academyGenerals: readonly General[] = [...result.world.generals.values()].filter(
        (g) => g.id.startsWith('gen_academy_'),
      )
      const wildGenerals: readonly General[] = [...result.world.generals.values()].filter(
        (g) => g.id.startsWith('gen_wild_'),
      )

      expect(academyGenerals).toHaveLength(0)
      expect(wildGenerals.length).toBeGreaterThan(0)
    })

    it('dormant academy state survives applyEventEffect (academy.dormant)', () => {
      const realm = makeRealm('realm_qi')
      const academy = makeAcademy({ status: 'active' })
      const world = makeEmptyWorld({
        realms: new Map([[realm.id, realm]]),
        academies: new Map([[academy.id, academy]]),
      })

      const dormantWorld = applyEventEffect(world, {
        type: 'academy.dormant',
        academyId: academy.id,
      })

      expect(dormantWorld.academies.get(academy.id)?.status).toBe('dormant')

      const yearStartWorld: World = { ...dormantWorld, date: yearStart, scenarioId: 'm1', tutorialState: null }
      const result = recruitmentPhase(yearStartWorld, yearStartWorld.rngState)

      const academyGenerals = [...result.world.generals.values()].filter((g) =>
        g.id.startsWith('gen_academy_'),
      )
      expect(academyGenerals).toHaveLength(0)
    })
  })

  describe('EC2: Zhou realm absent → zhou_investiture trigger fails but existing records persist', () => {
    it('predicate realm.zhouInvestiture.absent still returns true for surviving realm without grant', () => {
      const surviving = makeRealm('realm_qin')
      const world = makeEmptyWorld({
        realms: new Map([[surviving.id, surviving]]),
      })

      const node: PredicateNode = { kind: 'realm.zhouInvestiture.absent' }
      expect(evaluatePredicate(world, surviving, node)).toBe(true)
    })

    it('existing zhouInvestiture record survives Zhou realm being conquered/absent', () => {
      const qin = makeRealm('realm_qin')
      const investiture: ZhouInvestitureState = {
        realmId: qin.id,
        recognizedTitle: 'duke',
        grantedAtTick: 50,
        expiresAtTick: null,
        source: 'zhou',
        rank: 'duke',
      }
      const world = makeEmptyWorld({
        realms: new Map([[qin.id, qin]]),
        zhouInvestiture: new Map([[qin.id, investiture]]),
      })

      expect(world.realms.has('realm_zhou')).toBe(false)
      expect(world.zhouInvestiture.get(qin.id)?.rank).toBe('duke')
    })

    it('applyEventEffect zhouInvestiture.grant is no-op when target realmId not in world.realms', () => {
      const world = makeEmptyWorld({})

      const after = applyEventEffect(world, {
        type: 'zhouInvestiture.grant',
        realmId: 'realm_ghost',
        rank: 'duke',
      })

      expect(after.zhouInvestiture.has('realm_ghost')).toBe(false)
    })
  })

  describe('EC3: Cultural flip after sustained low identity', () => {
    it('chinese↔chinese flip after 50 years at low identity', () => {
      const flipTick = M6_CULTURAL_CHINESE_TO_CHINESE_YEARS * TICKS_PER_YEAR
      const sites = new Map<SiteId, Site>([
        [
          'site_a',
          makeSite({
            id: 'site_a',
            ownerId: 'realm_qin',
            cultural: 'chinese_qin',
            identity: 5,
            adjacency: ['site_b'],
            lowIdentitySinceTick: 0,
          }),
        ],
        [
          'site_b',
          makeSite({
            id: 'site_b',
            ownerId: 'realm_chu',
            cultural: 'chinese_chu',
            identity: 100,
            adjacency: ['site_a'],
          }),
        ],
      ])
      const world = makeEmptyWorld({ sites, tick: flipTick })

      const result = culturalIdentityPhase(world, RNG)

      expect(result.world.sites.get('site_a')?.cultural).toBe('chinese_chu')
      expect(result.events.some((e) => e.type === 'culturalTagFlipped')).toBe(true)
    })

    it('barbarian→chinese flip uses 200-year threshold (does NOT flip at 50 years)', () => {
      const fiftyYears = M6_CULTURAL_CHINESE_TO_CHINESE_YEARS * TICKS_PER_YEAR
      const twoHundredYears = M6_CULTURAL_CHINESE_TO_BARBARIAN_YEARS * TICKS_PER_YEAR
      const buildSites = (): Map<SiteId, Site> =>
        new Map<SiteId, Site>([
          [
            'site_barbarian',
            makeSite({
              id: 'site_barbarian',
              ownerId: 'realm_xirong',
              cultural: 'di_xirong',
              identity: 5,
              adjacency: ['site_chinese'],
              lowIdentitySinceTick: 0,
            }),
          ],
          [
            'site_chinese',
            makeSite({
              id: 'site_chinese',
              ownerId: 'realm_qin',
              cultural: 'chinese_qin',
              identity: 100,
              adjacency: ['site_barbarian'],
            }),
          ],
        ])

      const earlyResult = culturalIdentityPhase(
        makeEmptyWorld({ sites: buildSites(), tick: fiftyYears }),
        RNG,
      )
      expect(earlyResult.world.sites.get('site_barbarian')?.cultural).toBe('di_xirong')

      const lateResult = culturalIdentityPhase(
        makeEmptyWorld({ sites: buildSites(), tick: twoHundredYears }),
        RNG,
      )
      expect(lateResult.world.sites.get('site_barbarian')?.cultural).toBe('chinese_qin')
    })
  })

  describe('EC4: M6_ENABLED=false → all 4 phases are noop', () => {
    it('culturalIdentityPhase, ideologyDriftPhase, prestigeUpdatePhase, recruitmentPhase academy all noop', async () => {
      vi.resetModules()
      vi.doMock('~/content/m2/balance', async () => {
        const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
          '~/content/m2/balance',
        )
        return { ...actual, M6_ENABLED: false }
      })

      const { culturalIdentityPhase: cultural } = await import(
        '~/engine/systems/culture/cultural-identity-phase'
      )
      const { ideologyDriftPhase: ideology } = await import(
        '~/engine/systems/culture/ideology-drift-phase'
      )
      const { prestigeUpdatePhase: prestige } = await import(
        '~/engine/systems/culture/prestige-update-phase'
      )
      const { recruitmentPhase: recruit } = await import(
        '~/engine/systems/recruitment/recruitment'
      )

      const realm = makeRealm('realm_qi', { warVictoriesThisYear: 5 })
      const sites = new Map<SiteId, Site>([
        [
          'site_a',
          makeSite({
            id: 'site_a',
            ownerId: realm.id,
            cultural: 'chinese_qi',
            identity: 50,
            adjacency: ['site_b'],
          }),
        ],
        [
          'site_b',
          makeSite({
            id: 'site_b',
            ownerId: 'realm_qin',
            cultural: 'chinese_qin',
            identity: 50,
            adjacency: ['site_a'],
          }),
        ],
      ])
      const academy = makeAcademy({ hostRealmId: realm.id })

      const culturalWorld = makeEmptyWorld({
        sites,
        realms: new Map([[realm.id, realm]]),
      })
      const culturalResult = cultural(culturalWorld, RNG)
      expect(culturalResult.world).toBe(culturalWorld)
      expect(culturalResult.events).toEqual([])

      const ideologyWorld = makeEmptyWorld({
        date: yearStart,
        realms: new Map([[realm.id, realm]]),
      })
      const ideologyResult = ideology(ideologyWorld, RNG)
      expect(ideologyResult.world).toBe(ideologyWorld)
      expect(ideologyResult.events).toEqual([])

      const prestigeWorld = makeEmptyWorld({
        date: yearEnd,
        realms: new Map([[realm.id, realm]]),
      })
      const prestigeResult = prestige(prestigeWorld, RNG)
      expect(prestigeResult.world).toBe(prestigeWorld)
      expect(prestigeResult.events).toEqual([])

      const recruitWorld = makeEmptyWorld({
        date: yearStart,
        realms: new Map([[realm.id, realm]]),
        academies: new Map([[academy.id, academy]]),
      })
      const recruitResult = recruit(recruitWorld, recruitWorld.rngState)
      const academyGenerals = [...recruitResult.world.generals.values()].filter((g) =>
        g.id.startsWith('gen_academy_'),
      )
      expect(academyGenerals).toHaveLength(0)

      vi.doUnmock('~/content/m2/balance')
      vi.resetModules()
    })
  })

  describe('EC5: 5 subsystems active simultaneously without conflicts', () => {
    it('cultural diffusion + ideology drift + prestige + academy + tribute all run cleanly', () => {
      const qi = makeRealm('realm_qi', { prestige: 50, warVictoriesThisYear: 2 })
      const lu = makeRealm('realm_lu', { prestige: 30, warVictoriesThisYear: 0 })

      const sites = new Map<SiteId, Site>([
        [
          'site_qi_capital',
          makeSite({
            id: 'site_qi_capital',
            ownerId: qi.id,
            cultural: 'chinese_qi',
            identity: 90,
            adjacency: ['site_lu_capital'],
          }),
        ],
        [
          'site_lu_capital',
          makeSite({
            id: 'site_lu_capital',
            ownerId: lu.id,
            cultural: 'chinese_han',
            identity: 80,
            adjacency: ['site_qi_capital'],
          }),
        ],
      ])

      const academy = makeAcademy({
        id: 'academy_jixia',
        hostRealmId: qi.id,
        hostSiteId: 'site_qi_capital',
      })

      const tribute = makeTributeTreaty('treaty_tribute_lu_qi', lu.id, qi.id)

      const world = makeEmptyWorld({
        date: yearEnd,
        realms: new Map([
          [qi.id, qi],
          [lu.id, lu],
        ]),
        sites,
        academies: new Map([[academy.id, academy]]),
        treaties: new Map([[tribute.id, tribute]]),
        rulers: new Map([[qi.id, makeRuler(qi.id, 'benevolent')]]),
      })

      const culturalResult = culturalIdentityPhase(world, RNG)
      expect(() =>
        ideologyDriftPhase(culturalResult.world, culturalResult.nextRng),
      ).not.toThrow()
      const ideologyResult = ideologyDriftPhase(culturalResult.world, culturalResult.nextRng)
      const prestigeResult = prestigeUpdatePhase(ideologyResult.world, ideologyResult.nextRng)

      const luSite = prestigeResult.world.sites.get('site_lu_capital')
      expect(luSite?.cultural).toBeDefined()
      expect(luSite?.culturalIdentityStrength).toBeLessThan(80)

      expect(prestigeResult.world.realms.get(qi.id)?.prestige).toBeGreaterThan(0)
      expect(prestigeResult.world.realms.get(lu.id)?.prestige).toBeGreaterThanOrEqual(0)

      expect(prestigeResult.world.academies.size).toBe(1)
      expect(prestigeResult.world.treaties.size).toBe(1)
    })
  })

  describe('EC6: Realm split preserves cultural state on inherited sites', () => {
    it('after splitRealm, cultural tag and identity strength are preserved on each site', () => {
      const oldRealm: RealmId = 'realm_old'
      const oldSites = new Map<SiteId, Site>([
        [
          'site_x',
          makeSite({
            id: 'site_x',
            ownerId: oldRealm,
            cultural: 'chinese_qin',
            identity: 75,
          }),
        ],
        [
          'site_y',
          makeSite({
            id: 'site_y',
            ownerId: oldRealm,
            cultural: 'chinese_chu',
            identity: 60,
          }),
        ],
      ])
      const world = makeEmptyWorld({
        realms: new Map([[oldRealm, makeRealm(oldRealm)]]),
        sites: oldSites,
      })

      const result = splitRealm(world, oldRealm, {
        newRealmIdsBySite: { site_x: 'realm_a', site_y: 'realm_b' },
      })

      const siteX = result.world.sites.get('site_x')
      const siteY = result.world.sites.get('site_y')

      expect(siteX?.cultural).toBe('chinese_qin')
      expect(siteX?.culturalIdentityStrength).toBe(75)
      expect(siteX?.ownerId).toBe('realm_a')

      expect(siteY?.cultural).toBe('chinese_chu')
      expect(siteY?.culturalIdentityStrength).toBe(60)
      expect(siteY?.ownerId).toBe('realm_b')
    })
  })
})
