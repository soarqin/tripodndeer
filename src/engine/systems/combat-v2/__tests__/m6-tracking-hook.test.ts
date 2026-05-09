import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setCombatVarianceEnabled } from '~/engine/random'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'
import type {
  Academy,
  Army,
  Realm,
  RNGState,
  Site,
  World,
} from '~/shared/types'

const rng: RNGState = { seed: 0, counter: 0 }

function makeArmy(overrides: Partial<Army> = {}): Army {
  return {
    id: 'army_attacker',
    realmId: 'realm_qin',
    manpower: 1000,
    location: 'site_1',
    state: 'idle',
    destination: null,
    ticksRemaining: 0,
    source: null,
    ...overrides,
  }
}

function makeSite(id: string, ownerId: string | null, overrides: Partial<Site> = {}): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
    ...overrides,
  } as Site
}

function makeRealm(id: string, overrides: Partial<Realm> = {}): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#000000',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    economy: { treasury: 0, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    warVictoriesThisYear: 0,
    ...overrides,
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

interface BuildWorldOpts {
  readonly armies: readonly Army[]
  readonly sites: readonly Site[]
  readonly realms?: readonly Realm[]
  readonly academies?: readonly Academy[]
  readonly tick?: number
}

function buildWorld(opts: BuildWorldOpts): World {
  return makeEmptyWorld({
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: opts.tick ?? 0,
    sites: new Map(opts.sites.map((site) => [site.id, site])),
    armies: new Map(opts.armies.map((army) => [army.id, army])),
    realms: new Map((opts.realms ?? []).map((realm) => [realm.id, realm])),
    academies: new Map((opts.academies ?? []).map((a) => [a.id, a])),
    rngState: rng,
  })
}

describe('combatV2Step M6 tracking (M6_ENABLED=true)', () => {
  beforeEach(() => setCombatVarianceEnabled(false))
  afterEach(() => setCombatVarianceEnabled(true))

  it('increments warVictoriesThisYear on attacker victory', async () => {
    const { combatV2Step } = await import('../combat-v2-step')
    const attacker = makeArmy({
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
      manpower: 2000,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 200,
      location: 'site_2',
    })
    const world = buildWorld({
      armies: [attacker, defender],
      sites: [makeSite('site_1', 'realm_qin'), makeSite('site_2', 'realm_han')],
      realms: [makeRealm('realm_qin'), makeRealm('realm_han')],
    })

    const result = combatV2Step(world, rng)
    expect(result.world.realms.get('realm_qin')?.warVictoriesThisYear).toBe(1)
  })

  it('sets lastConquestTick = world.tick when site changes owner', async () => {
    const { combatV2Step } = await import('../combat-v2-step')
    const attacker = makeArmy({
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
      manpower: 2000,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 200,
      location: 'site_2',
    })
    const world = buildWorld({
      tick: 42,
      armies: [attacker, defender],
      sites: [makeSite('site_1', 'realm_qin'), makeSite('site_2', 'realm_han')],
      realms: [makeRealm('realm_qin'), makeRealm('realm_han')],
    })

    const result = combatV2Step(world, rng)
    expect(result.world.sites.get('site_2')?.ownerId).toBe('realm_qin')
    expect(result.world.sites.get('site_2')?.lastConquestTick).toBe(42)
  })

  it('sets host academy status to dormant when site changes owner', async () => {
    const { combatV2Step } = await import('../combat-v2-step')
    const attacker = makeArmy({
      state: 'marching',
      destination: 'site_qi_capital',
      source: 'site_1',
      ticksRemaining: 0,
      manpower: 2000,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_qi',
      manpower: 200,
      location: 'site_qi_capital',
    })
    const academy = makeAcademy({ id: 'academy_jixia', hostSiteId: 'site_qi_capital' })
    const world = buildWorld({
      armies: [attacker, defender],
      sites: [makeSite('site_1', 'realm_qin'), makeSite('site_qi_capital', 'realm_qi')],
      realms: [makeRealm('realm_qin'), makeRealm('realm_qi')],
      academies: [academy],
    })

    const result = combatV2Step(world, rng)
    expect(result.world.academies.get('academy_jixia')?.status).toBe('dormant')
    expect(result.events).toContainEqual({
      type: 'academyDormant',
      payload: {
        academyId: 'academy_jixia',
        siteId: 'site_qi_capital',
        byRealm: 'realm_qin',
      },
    })
  })

  it('does not change academy status when conquered site has no academy', async () => {
    const { combatV2Step } = await import('../combat-v2-step')
    const attacker = makeArmy({
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
      manpower: 2000,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 200,
      location: 'site_2',
    })
    const academy = makeAcademy({ hostSiteId: 'site_qi_capital' })
    const world = buildWorld({
      armies: [attacker, defender],
      sites: [makeSite('site_1', 'realm_qin'), makeSite('site_2', 'realm_han')],
      realms: [makeRealm('realm_qin'), makeRealm('realm_han')],
      academies: [academy],
    })

    const result = combatV2Step(world, rng)
    expect(result.world.academies.get('academy_jixia')?.status).toBe('active')
    expect(result.events.some((e) => e.type === 'academyDormant')).toBe(false)
  })

  it('does not increment warVictoriesThisYear when defender wins', async () => {
    const { combatV2Step } = await import('../combat-v2-step')
    const attacker = makeArmy({
      state: 'marching',
      destination: 'site_2',
      source: 'site_1',
      ticksRemaining: 0,
      manpower: 200,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_han',
      manpower: 2000,
      location: 'site_2',
    })
    const world = buildWorld({
      armies: [attacker, defender],
      sites: [makeSite('site_1', 'realm_qin'), makeSite('site_2', 'realm_han')],
      realms: [makeRealm('realm_qin'), makeRealm('realm_han')],
    })

    const result = combatV2Step(world, rng)
    expect(result.world.realms.get('realm_qin')?.warVictoriesThisYear ?? 0).toBe(0)
    expect(result.world.realms.get('realm_han')?.warVictoriesThisYear ?? 0).toBe(0)
  })

})

describe('combatV2Step M6 tracking — multi-academy and determinism', () => {
  beforeEach(() => setCombatVarianceEnabled(false))
  afterEach(() => setCombatVarianceEnabled(true))

  it('only sets dormant on the matching academy when multiple academies exist', async () => {
    const { combatV2Step } = await import('../combat-v2-step')
    const attacker = makeArmy({
      state: 'marching',
      destination: 'site_qi_capital',
      source: 'site_1',
      ticksRemaining: 0,
      manpower: 2000,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_qi',
      manpower: 200,
      location: 'site_qi_capital',
    })
    const jixia = makeAcademy({ id: 'academy_jixia', hostSiteId: 'site_qi_capital' })
    const xihe = makeAcademy({
      id: 'academy_xihe',
      hostRealmId: 'realm_wei',
      hostSiteId: 'site_wei_xihe',
      primaryIdeology: 'fa',
      secondaryIdeology: 'bing',
    })
    const world = buildWorld({
      armies: [attacker, defender],
      sites: [makeSite('site_1', 'realm_qin'), makeSite('site_qi_capital', 'realm_qi')],
      realms: [makeRealm('realm_qin'), makeRealm('realm_qi')],
      academies: [jixia, xihe],
    })

    const result = combatV2Step(world, rng)
    expect(result.world.academies.get('academy_jixia')?.status).toBe('dormant')
    expect(result.world.academies.get('academy_xihe')?.status).toBe('active')
  })

  it('does not change M6 tracking fields when no battle occurs', async () => {
    const { combatV2Step } = await import('../combat-v2-step')
    const idleArmy = makeArmy({ state: 'idle' })
    const world = buildWorld({
      armies: [idleArmy],
      sites: [makeSite('site_1', 'realm_qin')],
      realms: [makeRealm('realm_qin', { warVictoriesThisYear: 5 })],
    })

    const result = combatV2Step(world, rng)
    expect(result.world.realms.get('realm_qin')?.warVictoriesThisYear).toBe(5)
    expect(result.world.sites.get('site_1')?.lastConquestTick).toBeNull()
  })

  it('produces deterministic output across re-runs with same input', async () => {
    const { combatV2Step } = await import('../combat-v2-step')
    function makeFreshWorld(): World {
      const attacker = makeArmy({
        state: 'marching',
        destination: 'site_qi_capital',
        source: 'site_1',
        ticksRemaining: 0,
        manpower: 2000,
      })
      const defender = makeArmy({
        id: 'army_defender',
        realmId: 'realm_qi',
        manpower: 200,
        location: 'site_qi_capital',
      })
      return buildWorld({
        tick: 7,
        armies: [attacker, defender],
        sites: [makeSite('site_1', 'realm_qin'), makeSite('site_qi_capital', 'realm_qi')],
        realms: [makeRealm('realm_qin'), makeRealm('realm_qi')],
        academies: [makeAcademy({ id: 'academy_jixia', hostSiteId: 'site_qi_capital' })],
      })
    }

    const a = combatV2Step(makeFreshWorld(), rng)
    const b = combatV2Step(makeFreshWorld(), rng)
    expect(a.world.realms.get('realm_qin')?.warVictoriesThisYear).toBe(
      b.world.realms.get('realm_qin')?.warVictoriesThisYear,
    )
    expect(a.world.sites.get('site_qi_capital')?.lastConquestTick).toBe(
      b.world.sites.get('site_qi_capital')?.lastConquestTick,
    )
    expect(a.events.filter((e) => e.type === 'academyDormant')).toEqual(
      b.events.filter((e) => e.type === 'academyDormant'),
    )
  })
})

describe('combatV2Step M6 tracking (M6_ENABLED=false)', () => {
  beforeEach(() => {
    setCombatVarianceEnabled(false)
    vi.resetModules()
  })
  afterEach(() => {
    setCombatVarianceEnabled(true)
    vi.resetModules()
    vi.doUnmock('~/content/m2/balance')
  })

  it('does not write any M6 tracking fields when feature flag is off', async () => {
    vi.doMock('~/content/m2/balance', async () => {
      const actual = await vi.importActual<typeof import('~/content/m2/balance')>(
        '~/content/m2/balance',
      )
      return { ...actual, M6_ENABLED: false }
    })

    const { combatV2Step } = await import('../combat-v2-step')

    const attacker = makeArmy({
      state: 'marching',
      destination: 'site_qi_capital',
      source: 'site_1',
      ticksRemaining: 0,
      manpower: 2000,
    })
    const defender = makeArmy({
      id: 'army_defender',
      realmId: 'realm_qi',
      manpower: 200,
      location: 'site_qi_capital',
    })
    const academy = makeAcademy({ id: 'academy_jixia', hostSiteId: 'site_qi_capital' })
    const world = buildWorld({
      tick: 9,
      armies: [attacker, defender],
      sites: [makeSite('site_1', 'realm_qin'), makeSite('site_qi_capital', 'realm_qi')],
      realms: [makeRealm('realm_qin'), makeRealm('realm_qi')],
      academies: [academy],
    })

    const result = combatV2Step(world, rng)
    expect(result.world.realms.get('realm_qin')?.warVictoriesThisYear ?? 0).toBe(0)
    expect(result.world.sites.get('site_qi_capital')?.lastConquestTick ?? null).toBeNull()
    expect(result.world.academies.get('academy_jixia')?.status).toBe('active')
    expect(result.events.some((e) => e.type === 'academyDormant')).toBe(false)
  })
})
