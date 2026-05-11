import { describe, expect, it } from 'vitest'
import { getCurrentScenarioId } from '../use-hint-coordinator'
import type { ScenarioId, Site, World } from '~/shared/types'

function makeSite(id: string): Site {
  return {
    id,
    name: id,
    position: [0, 0],
    boundary: [],
    ownerId: null,
    polygon: [],
    adjacency: [],
    economy: {
      population: 0,
      households: 0,
      taxBase: 0,
      foodProduction: 0,
    },
  }
}

function makeMinimalWorld(sitesCount: number, scenarioId: ScenarioId = 'm1'): World {
  return {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 0,
    sites: new Map(Array.from({ length: sitesCount }, (_, index) => [`site_${index}`, makeSite(`site_${index}`)])),
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
    difficulty: 'hero',
    diplomaticMemory: new Map(),
    playerRealmId: 'realm_qin',
    scenarioId,
    tutorialState: null,
    rngState: { seed: 42, counter: 0 },
    phases: [],
    pendingOrders: [],
  }
}

describe('getCurrentScenarioId', () => {
  it('returns explicit m1 scenarioId regardless of site count', () => {
    const world = makeMinimalWorld(50, 'm1')
    expect(getCurrentScenarioId(world)).toBe('m1')
  })

  it('returns explicit m9 scenarioId regardless of site count', () => {
    const world = makeMinimalWorld(250, 'm9')
    expect(getCurrentScenarioId(world)).toBe('m9')
  })

  it('returns explicit m9 even when site count is small', () => {
    const world = makeMinimalWorld(50, 'm9')
    expect(getCurrentScenarioId(world)).toBe('m9')
  })
})
