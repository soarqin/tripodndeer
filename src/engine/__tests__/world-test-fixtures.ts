import type { World } from '~/shared/types'

export const TEST_WORLD_DATE = {
  yearBC: 260,
  season: 'spring',
  month: 1,
  xun: 'shang',
} as const

export function makeTestWorld(overrides: Partial<World> = {}): World {
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
    rulers: new Map(),
    eventChainStates: new Map(),
    reformStates: new Map(),
    passes: new Map(),
    adjacencyEdges: new Map(),
    sieges: new Map(),
    edicts: new Map(),
    governorAssignments: new Map(),
    playerRealmId: 'realm_qin',
    rngState: { seed: 0, counter: 0 },
    phases: [],
    pendingOrders: [],
    ...overrides,
  }
}
