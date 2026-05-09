import type {
  Academy,
  AcademyId,
  CharId,
  CharacterTemplate,
  CounterIntelState,
  General,
  GeneralId,
  IntelligenceCoverage,
  Province,
  ProvinceId,
  Realm,
  RealmId,
  Region,
  RegionId,
  RNGState,
  Site,
  SiteId,
  SpyMission,
  SpyMissionId,
  World,
} from '~/shared/types'

export const TEST_WORLD_DATE = {
  yearBC: 260,
  season: 'spring',
  month: 1,
  xun: 'shang',
} as const

const DEFAULT_RNG: RNGState = { seed: 0, counter: 0 }

type SiteM6Fields = Pick<Site, 'cultural' | 'culturalIdentityStrength' | 'lastConquestTick' | 'lowIdentitySinceTick'>
type SiteOverride = Omit<Site, keyof SiteM6Fields> & Partial<SiteM6Fields>
type RealmM6Fields = Pick<Realm, 'prestige' | 'ideologyLean' | 'warVictoriesThisYear'>
type RealmOverride = Omit<Realm, keyof RealmM6Fields> & Partial<RealmM6Fields>

interface MakeEmptyWorldOverrides extends Omit<Partial<World>, 'sites' | 'realms'> {
  readonly sites?: ReadonlyMap<SiteId, SiteOverride>
  readonly realms?: ReadonlyMap<RealmId, RealmOverride>
}

function normalizeSites(sites?: ReadonlyMap<SiteId, SiteOverride>): ReadonlyMap<SiteId, Site> {
  if (!sites) return new Map()
  return new Map(
    [...sites].map(([id, site]) => [
      id,
      {
        ...site,
        cultural: site.cultural ?? 'di_xirong',
        culturalIdentityStrength: site.culturalIdentityStrength ?? 100,
        lastConquestTick: site.lastConquestTick ?? null,
        lowIdentitySinceTick: site.lowIdentitySinceTick ?? null,
      },
    ]),
  )
}

function normalizeRealms(realms?: ReadonlyMap<RealmId, RealmOverride>): ReadonlyMap<RealmId, Realm> {
  if (!realms) return new Map()
  return new Map(
    [...realms].map(([id, realm]) => [
      id,
      {
        ...realm,
        prestige: realm.prestige ?? 40,
        ideologyLean: realm.ideologyLean ?? { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
        warVictoriesThisYear: realm.warVictoriesThisYear ?? 0,
      },
    ]),
  )
}

export function makeEmptyWorld(overrides: MakeEmptyWorldOverrides = {}): World {
  const { sites, realms, ...rest } = overrides
  return {
    date: TEST_WORLD_DATE,
    tick: 0,
    sites: normalizeSites(sites),
    realms: normalizeRealms(realms),
    armies: new Map(),
    edges: new Map(),
    wars: new Map(),
    peaceProposals: new Map(),
    relations: new Map(),
    diplomaticProposals: new Map(),
    treaties: new Map(),
    diplomacyHistory: [],
    coalitions: new Map(),
    zhouInvestiture: new Map(),
    generals: new Map(),
    rulers: new Map(),
    academies: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    disasterStates: new Map(),
    tradeRoutes: new Map(),
    factionInfluences: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    intelligenceCoverage: new Map(),
    spyMissions: new Map(),
    counterIntelStates: new Map(),
    provinces: new Map(),
    regions: new Map(),
    characterTemplates: new Map(),
    localization: new Map(),
    aiState: new Map(),
    difficulty: 'common',
    diplomaticMemory: new Map(),
    playerRealmId: 'realm_qin',
    rngState: { ...DEFAULT_RNG },
    phases: [],
    pendingOrders: [],
    ...rest,
  }
}

export interface MakeM5WorldOptions {
  readonly realmIds?: readonly RealmId[]
  readonly withRulers?: boolean
  readonly withCharacters?: boolean
}

const DEFAULT_M5_REALM_IDS: readonly RealmId[] = ['realm_qin', 'realm_chu']

export function makeM5World(opts: MakeM5WorldOptions = {}): World {
  const realmIds = opts.realmIds && opts.realmIds.length > 0 ? opts.realmIds : DEFAULT_M5_REALM_IDS

  const realms = new Map<RealmId, Realm>()
  for (const id of realmIds) {
    realms.set(id, makeMinimalRealm(id))
  }

  const generals = new Map<GeneralId, General>()
  if (opts.withCharacters) {
    realmIds.forEach((realmId, index) => {
      const generalId: GeneralId = `general_${realmId}_${index}`
      generals.set(generalId, {
        id: generalId,
        realmId,
        name: `General ${index + 1}`,
        might: 60,
        command: 60,
        loyalty: 80,
        strategy: 50,
        learning: 50,
      })
    })
  }

  return makeEmptyWorld({
    realms,
    generals,
    playerRealmId: realmIds[0] ?? 'realm_qin',
  })
}

function makeMinimalRealm(id: RealmId): Realm {
  return {
    id,
    displayName: id,
    fullTitle: id,
    color: '#dc2626',
    capital: `site_${id}_capital`,
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'cautious',
    economy: {
      treasury: 1000,
      foodStores: 1000,
      taxRate: 0.1,
    },
    traits: [],
    politicalSystem: 'enfeoffment',
    prestige: 40,
    ideologyLean: { fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 },
    warVictoriesThisYear: 0,
  }
}

export interface MakeM6WorldOptions {
  readonly realms?: ReadonlyMap<RealmId, Realm>
  readonly sites?: ReadonlyMap<SiteId, Site>
  readonly generals?: ReadonlyMap<GeneralId, General>
  readonly academies?: ReadonlyMap<AcademyId, Academy>
  readonly playerRealmId?: RealmId
}

export function makeM6World(opts: MakeM6WorldOptions = {}): World {
  return makeEmptyWorld({
    realms: opts.realms,
    sites: opts.sites,
    generals: opts.generals,
    academies: opts.academies ?? new Map(),
    playerRealmId: opts.playerRealmId,
  })
}

export interface MakeM7WorldOptions {
  readonly realms?: ReadonlyMap<RealmId, Realm>
  readonly sites?: ReadonlyMap<SiteId, Site>
  readonly generals?: ReadonlyMap<GeneralId, General>
  readonly intelligenceCoverage?: IntelligenceCoverage
  readonly spyMissions?: ReadonlyMap<SpyMissionId, SpyMission>
  readonly counterIntelStates?: ReadonlyMap<RealmId, CounterIntelState>
  readonly playerRealmId?: RealmId
}

export function makeM7World(opts: MakeM7WorldOptions = {}): World {
  return makeEmptyWorld({
    realms: opts.realms,
    sites: opts.sites,
    generals: opts.generals,
    intelligenceCoverage: opts.intelligenceCoverage ?? new Map(),
    spyMissions: opts.spyMissions ?? new Map(),
    counterIntelStates: opts.counterIntelStates ?? new Map(),
    playerRealmId: opts.playerRealmId,
  })
}

export interface MakeM9WorldOptions {
  readonly realms?: ReadonlyMap<RealmId, Realm>
  readonly sites?: ReadonlyMap<SiteId, Site>
  readonly generals?: ReadonlyMap<GeneralId, General>
  readonly provinces?: ReadonlyMap<ProvinceId, Province>
  readonly regions?: ReadonlyMap<RegionId, Region>
  readonly characterTemplates?: ReadonlyMap<CharId, CharacterTemplate>
  readonly playerRealmId?: RealmId
}

export function makeM9World(opts: MakeM9WorldOptions = {}): World {
  return makeEmptyWorld({
    realms: opts.realms,
    sites: opts.sites,
    generals: opts.generals,
    provinces: opts.provinces ?? new Map(),
    regions: opts.regions ?? new Map(),
    characterTemplates: opts.characterTemplates ?? new Map(),
    playerRealmId: opts.playerRealmId,
  })
}
