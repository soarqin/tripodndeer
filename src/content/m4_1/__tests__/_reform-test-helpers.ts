import type {
  General,
  PersonalityArchetype,
  Realm,
  RealmId,
  RulerState,
  Site,
  World,
} from '~/shared/types'
import { makeEmptyWorld } from '~/shared/__tests__/fixtures'

export function makeRealm(overrides: Partial<Realm> & { id: RealmId }): Realm {
  const { id } = overrides
  return {
    displayName: id,
    fullTitle: id,
    color: '#888888',
    capital: `${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: { treasury: 2000, foodStores: 0, taxRate: 10 },
    traits: [],
    politicalSystem: 'enfeoffment',
    ...overrides,
  }
}

export function makeRuler(
  realmId: RealmId,
  personality: PersonalityArchetype,
  overrides: Partial<RulerState> = {},
): RulerState {
  return {
    realmId,
    generalId: `gen_${realmId}_ruler`,
    age: 30,
    lifespan: 60,
    health: 100,
    personality,
    successionLawId: 'primogeniture',
    inOfficeSinceTick: 0,
    ...overrides,
  }
}

export function makeReformer(realmId: RealmId, id = `gen_${realmId}_reformer`): General {
  return {
    id,
    realmId,
    name: 'Reformer',
    might: 50,
    command: 50,
    loyalty: 80,
    specialty: 'reformer',
  }
}

export function makeSite(id: string, ownerId: RealmId, population: number): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId,
    polygon: [],
    adjacency: [],
    economy: {
      population,
      households: Math.floor(population / 4),
      taxBase: population,
      foodProduction: population,
    },
  }
}

export interface ReformWorldOpts {
  yearBC: number
  tick?: number
  realm: Realm
  ruler?: RulerState
  reformer?: General
  sites?: readonly Site[]
}

export function makeReformWorld(opts: ReformWorldOpts): World {
  const generals = new Map<string, General>()
  if (opts.reformer) generals.set(opts.reformer.id, opts.reformer)
  const rulers = new Map<RealmId, RulerState>()
  if (opts.ruler) rulers.set(opts.realm.id, opts.ruler)
  const sites = new Map<string, Site>()
  for (const site of opts.sites ?? []) sites.set(site.id, site)
  return makeEmptyWorld({
    date: { yearBC: opts.yearBC, season: 'spring', month: 1, xun: 'shang' },
    tick: opts.tick ?? 100,
    realms: new Map([[opts.realm.id, opts.realm]]),
    rulers,
    generals,
    sites,
  })
}

export const WHITELISTED_EFFECT_TYPES = new Set([
  'realm.treasury',
  'character.create',
  'character.kill',
  'character.loyalty',
  'realm.trait.add',
  'realm.politicalSystem.set',
])
