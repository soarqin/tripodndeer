import type { General, GeneralId, Realm, RealmId, RNGState, World } from '~/shared/types'

// M5 will add `rulers` and `eventChainStates` to World (planned in T1.4).
// Update this fixture when those fields land on the World type.

export const TEST_WORLD_DATE = {
  yearBC: 260,
  season: 'spring',
  month: 1,
  xun: 'shang',
} as const

const DEFAULT_RNG: RNGState = { seed: 0, counter: 0 }

export function makeEmptyWorld(overrides: Partial<World> = {}): World {
  return {
    date: TEST_WORLD_DATE,
    tick: 0,
    sites: new Map(),
    realms: new Map(),
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
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    playerRealmId: 'realm_qin',
    rngState: { ...DEFAULT_RNG },
    phases: [],
    pendingOrders: [],
    ...overrides,
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
  }
}
