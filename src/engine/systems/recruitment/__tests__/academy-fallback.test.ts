import { describe, expect, it, vi } from 'vitest'
import type {
  Academy,
  CharacterRecruitedEvent,
  General,
  IdeologyLean,
  Realm,
  RealmId,
  RNGState,
  World,
} from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import { recruitmentPhase } from '../recruitment'
import {
  M5_RECRUITMENT_PER_REALM_PER_YEAR,
  M6_ACADEMY_HOST_RATIO,
  M6_ACADEMY_NEAR_RATIO,
  M6_ACADEMY_FAR_RATIO,
} from '~/content/m2/balance'

const yearStart = { yearBC: 260, season: 'spring', month: 1, xun: 'shang' } as const

function makeRealm(id: RealmId, ideologyLean?: IdeologyLean): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: ideologyLean ?? { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
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

function makeWorld(opts: {
  realms: readonly Realm[]
  academies?: readonly Academy[]
  rngState?: RNGState
}): World {
  return makeEmptyWorld({
    date: yearStart,
    realms: new Map(opts.realms.map((r) => [r.id, r])),
    academies: new Map((opts.academies ?? []).map((a) => [a.id, a])),
    rngState: opts.rngState ?? { seed: 1, counter: 0 },
  })
}

describe('recruitmentPhase academy-first production (M6)', () => {
  it('active academy produces talent with almaMater set', () => {
    const realm = makeRealm('realm_qi')
    const academy = makeAcademy()
    const world = makeWorld({ realms: [realm], academies: [academy] })

    const result = recruitmentPhase(world, world.rngState)

    const academyGenerals = [...result.world.generals.values()].filter((g) =>
      g.id.startsWith(`gen_academy_${academy.id}`),
    )
    expect(academyGenerals).toHaveLength(1)
    expect(academyGenerals[0]!.almaMater).toBe(academy.id)
  })

  it('dormant academy produces no talent', () => {
    const realm = makeRealm('realm_qi')
    const academy = makeAcademy({ status: 'dormant' })
    const world = makeWorld({ realms: [realm], academies: [academy] })

    const result = recruitmentPhase(world, world.rngState)

    const academyGenerals = [...result.world.generals.values()].filter((g) =>
      g.id.startsWith('gen_academy_'),
    )
    expect(academyGenerals).toHaveLength(0)
  })

  it('no academy → only M5 random fallback runs', () => {
    const realm = makeRealm('realm_qin')
    const world = makeWorld({ realms: [realm] })

    const result = recruitmentPhase(world, world.rngState)

    const wildGenerals = [...result.world.generals.values()].filter((g) =>
      g.id.startsWith('gen_wild_'),
    )
    const academyGenerals = [...result.world.generals.values()].filter((g) =>
      g.id.startsWith('gen_academy_'),
    )
    expect(wildGenerals).toHaveLength(M5_RECRUITMENT_PER_REALM_PER_YEAR)
    expect(academyGenerals).toHaveLength(0)
  })

  it('academy talent is in addition to M5 default recruitment', () => {
    const realm = makeRealm('realm_qi')
    const academy = makeAcademy()
    const world = makeWorld({ realms: [realm], academies: [academy] })

    const result = recruitmentPhase(world, world.rngState)

    expect(result.world.generals.size).toBe(M5_RECRUITMENT_PER_REALM_PER_YEAR + 1)
  })

  it('60/30/10 distribution targets host/near/far across many seeds', () => {
    const host = makeRealm('realm_qi', { fa: 0, ru: 80, dao: 40, mo: 0, zonghen: 0, bing: 0 })
    const near = makeRealm('realm_lu', { fa: 0, ru: 70, dao: 30, mo: 0, zonghen: 0, bing: 0 })
    const far = makeRealm('realm_qin', { fa: 80, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 20 })
    const academy = makeAcademy({ hostRealmId: host.id })

    const counts = { host: 0, near: 0, far: 0 }
    const TRIALS = 200

    for (let seed = 1; seed <= TRIALS; seed++) {
      const world = makeWorld({
        realms: [host, near, far],
        academies: [academy],
        rngState: { seed, counter: 0 },
      })
      const result = recruitmentPhase(world, world.rngState)
      const academyGenerals = [...result.world.generals.values()].filter((g) =>
        g.almaMater === academy.id,
      )
      expect(academyGenerals).toHaveLength(1)
      const target = academyGenerals[0]!.realmId
      if (target === host.id) counts.host += 1
      else if (target === near.id) counts.near += 1
      else if (target === far.id) counts.far += 1
    }

    const tolerance = 0.15
    expect(Math.abs(counts.host / TRIALS - M6_ACADEMY_HOST_RATIO)).toBeLessThan(tolerance)
    expect(Math.abs(counts.near / TRIALS - M6_ACADEMY_NEAR_RATIO)).toBeLessThan(tolerance)
    expect(Math.abs(counts.far / TRIALS - M6_ACADEMY_FAR_RATIO)).toBeLessThan(tolerance)
  })

  it('falls back to host when only one realm exists', () => {
    const host = makeRealm('realm_qi')
    const academy = makeAcademy({ hostRealmId: host.id })
    const world = makeWorld({ realms: [host], academies: [academy] })

    const result = recruitmentPhase(world, world.rngState)
    const academyGenerals = [...result.world.generals.values()].filter((g) =>
      g.almaMater === academy.id,
    )
    expect(academyGenerals[0]!.realmId).toBe(host.id)
  })

  it('is deterministic with same seed', () => {
    const realm = makeRealm('realm_qi')
    const academy = makeAcademy()
    const seed: RNGState = { seed: 42, counter: 0 }
    const a = recruitmentPhase(makeWorld({ realms: [realm], academies: [academy], rngState: seed }), seed)
    const b = recruitmentPhase(makeWorld({ realms: [realm], academies: [academy], rngState: seed }), seed)

    const aGenerals = [...a.world.generals.values()]
      .map((g) => ({ id: g.id, name: g.name, realmId: g.realmId, almaMater: g.almaMater }))
    const bGenerals = [...b.world.generals.values()]
      .map((g) => ({ id: g.id, name: g.name, realmId: g.realmId, almaMater: g.almaMater }))
    expect(aGenerals).toEqual(bGenerals)
    expect(a.nextRng).toEqual(b.nextRng)
  })

  it('multiple academies in one realm each produce a talent', () => {
    const realm = makeRealm('realm_qi')
    const academyA = makeAcademy({ id: 'academy_a' })
    const academyB = makeAcademy({ id: 'academy_b' })
    const world = makeWorld({ realms: [realm], academies: [academyA, academyB] })

    const result = recruitmentPhase(world, world.rngState)
    const academyGenerals = [...result.world.generals.values()].filter((g) =>
      g.id.startsWith('gen_academy_'),
    )
    expect(academyGenerals).toHaveLength(2)
    const almaMaters = new Set(academyGenerals.map((g) => g.almaMater))
    expect(almaMaters).toEqual(new Set(['academy_a', 'academy_b']))
  })

  it('emits characterRecruited event for academy talent with target realmId', () => {
    const realm = makeRealm('realm_qi')
    const academy = makeAcademy()
    const world = makeWorld({ realms: [realm], academies: [academy] })

    const result = recruitmentPhase(world, world.rngState)
    const events = result.events as readonly CharacterRecruitedEvent[]
    const academyEvent = events.find((e) => e.payload.generalId.startsWith('gen_academy_'))
    expect(academyEvent).toBeDefined()
    expect(academyEvent!.payload.realmId).toBe(realm.id)
  })

  it('academy production runs only at year start', () => {
    const midYear = { yearBC: 260, season: 'summer', month: 2, xun: 'zhong' } as const
    const realm = makeRealm('realm_qi')
    const academy = makeAcademy()
    const world: World = makeEmptyWorld({
      date: midYear,
      realms: new Map([[realm.id, realm]]),
      academies: new Map([[academy.id, academy]]),
    })

    const result = recruitmentPhase(world, world.rngState)
    expect(result.world).toBe(world)
    expect(result.events).toEqual([])
  })

  it('does not run academy production when M6_ENABLED is false', async () => {
    vi.resetModules()
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M6_ENABLED: false }
    })

    const { recruitmentPhase: phase } = await import('../recruitment')
    const realm = makeRealm('realm_qi')
    const academy = makeAcademy()
    const world = makeWorld({ realms: [realm], academies: [academy] })

    const result = phase(world, world.rngState)
    const academyGenerals: readonly General[] = [...result.world.generals.values()].filter((g) =>
      g.id.startsWith('gen_academy_'),
    )
    expect(academyGenerals).toHaveLength(0)
    expect(result.world.generals.size).toBe(M5_RECRUITMENT_PER_REALM_PER_YEAR)

    vi.doUnmock('~/content/m2/balance')
    vi.resetModules()
  })
})
