import { describe, it, expect } from 'vitest'
import {
  AdjacencyEdgeSchema,
  ArmySchema,
  ArmyStateSchema,
  GeneralSchema,
  M0DataSchema,
  M1DataSchema,
  MapEdgeSchema,
  OrderSchema,
  PassSchema,
  PeaceProposalSchema,
  PeaceTermSchema,
  RealmStatsSchema,
  SiteOccupationSchema,
  WorldSchema,
} from '../schemas'

const validPolylineEdge = {
  id: 'e_001',
  curveType: 'polyline' as const,
  travel_cost: 1,
  anchors: [[0, 0], [100, 50], [200, 0]] as const,
}
const validBezierEdge = {
  id: 'e_002',
  curveType: 'cubic-bezier' as const,
  travel_cost: 2,
  anchors: [[0, 0], [100, 50], [200, 0]] as const,
  controls: [[[10, 10], [90, 40]], [[110, 60], [190, 10]]] as const,
}
const validSite = {
  id: 'site_1',
  name: '邑甲',
  position: [100, 100] as const,
  boundary: [
    { edge: 'e_001', reverse: false },
    { edge: 'e_002', reverse: true },
    { edge: 'e_003', reverse: false },
  ],
}
const validRealm = {
  id: 'realm_red',
  displayName: '红',
  fullTitle: '红方',
  color: '#dc2626',
  capital: 'site_1',
  initialSites: ['site_1'],
  initialArmies: [],
  aiPersonality: 'aggressive_random' as const,
}
const validData = {
  edges: { e_001: validPolylineEdge, e_002: validBezierEdge, e_003: validPolylineEdge },
  sites: [validSite],
  realms: [validRealm],
  initialOwnership: { site_1: 'realm_red' },
}

const validIdleArmy = {
  id: 'army_001',
  realmId: 'realm_red',
  manpower: 120,
  location: 'site_1',
  state: 'idle' as const,
  destination: null,
  ticksRemaining: 0,
  source: null,
}

const validMarchOrder = {
  type: 'march' as const,
  armyId: 'army_001',
  targetSiteId: 'site_2',
}

describe('MapEdgeSchema valid', () => {
  it('accepts polyline edge', () => {
    expect(() => MapEdgeSchema.parse(validPolylineEdge)).not.toThrow()
  })

  it('accepts cubic-bezier edge with correct controls', () => {
    expect(() => MapEdgeSchema.parse(validBezierEdge)).not.toThrow()
  })

  it('accepts travel_cost in range', () => {
    expect(() => MapEdgeSchema.parse({ ...validPolylineEdge, travel_cost: 10 })).not.toThrow()
  })
})

describe('MapEdgeSchema invalid', () => {
  it('rejects cubic-bezier with missing controls', () => {
    const bad = { ...validBezierEdge, controls: undefined }
    expect(() => MapEdgeSchema.parse(bad)).toThrow()
  })

  it('rejects cubic-bezier with wrong controls length', () => {
    const bad = { ...validBezierEdge, controls: [[[10, 10], [90, 40]]] }
    expect(() => MapEdgeSchema.parse(bad)).toThrow()
  })

  it('rejects travel_cost below range', () => {
    const bad = { ...validPolylineEdge, travel_cost: 0 }
    expect(() => MapEdgeSchema.parse(bad)).toThrow()
  })

  it('rejects travel_cost above range', () => {
    const bad = { ...validPolylineEdge, travel_cost: 11 }
    expect(() => MapEdgeSchema.parse(bad)).toThrow()
  })
})

describe('M0DataSchema valid', () => {
  it('accepts valid edge-indexed data', () => {
    expect(() => M0DataSchema.parse(validData)).not.toThrow()
  })

  it('returns typed object', () => {
    const result = M0DataSchema.parse(validData)
    expect(result.sites[0]?.id).toBe('site_1')
    expect(Object.keys(result.edges)).toContain('e_001')
  })
})

describe('M0DataSchema invalid', () => {
  it('rejects site with boundary < 3 entries', () => {
    const bad = {
      ...validData,
      sites: [{ ...validSite, boundary: [{ edge: 'e_001', reverse: false }, { edge: 'e_002', reverse: true }] }],
    }
    expect(() => M0DataSchema.parse(bad)).toThrow()
  })

  it('rejects wrong types', () => {
    const bad = { ...validData, edges: 'not-an-object' }
    expect(() => M0DataSchema.parse(bad)).toThrow()
  })
})

describe('M1DataSchema valid', () => {
  const validM1Data = {
    edges: validData.edges,
    sites: validData.sites,
    realms: [
      validRealm,
      { ...validRealm, id: 'realm_blue', displayName: '蓝', fullTitle: '蓝方', color: '#2563eb' },
    ],
    initialOwnership: { site_1: 'realm_red' },
    initialArmies: [],
    initialWars: [],
  }

  it('accepts valid M1 data', () => {
    expect(() => M1DataSchema.parse(validM1Data)).not.toThrow()
  })

  it('accepts empty initialWars', () => {
    const result = M1DataSchema.parse(validM1Data)
    expect(result.initialWars).toEqual([])
  })

  it('accepts empty initialArmies', () => {
    const result = M1DataSchema.parse(validM1Data)
    expect(result.initialArmies).toEqual([])
  })

  it('rejects missing realms field', () => {
    const bad: Partial<typeof validM1Data> = { ...validM1Data }
    delete bad.realms
    expect(() => M1DataSchema.parse(bad)).toThrow()
  })

  it('rejects invalid edge without travel_cost', () => {
    const bad = {
      ...validM1Data,
      edges: {
        ...validM1Data.edges,
        e_001: { ...validPolylineEdge, travel_cost: undefined },
      },
    }
    expect(() => M1DataSchema.parse(bad)).toThrow()
  })
})

describe('WorldSchema', () => {
  it('accepts a runtime world shape', () => {
    expect(
      () =>
        WorldSchema.parse({
          date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
          tick: 0,
          sites: new Map(),
          realms: new Map(),
          armies: new Map(),
          edges: new Map(),
          wars: new Map(),
          peaceProposals: new Map(),
          generals: new Map(),
          passes: new Map(),
          adjacencyEdges: new Map(),
          playerRealmId: 'realm_red',
          rngState: { seed: 1, counter: 0 },
          phases: [],
          pendingOrders: [],
        }),
    ).not.toThrow()
  })
})

describe('ArmySchema', () => {
  it('accepts a valid idle army', () => {
    expect(() => ArmySchema.parse(validIdleArmy)).not.toThrow()
  })

  it('accepts a valid idle army with null destination', () => {
    const result = ArmySchema.parse(validIdleArmy)
    expect(result.destination).toBeNull()
    expect(result.location).toBe('site_1')
  })

  it('rejects negative manpower', () => {
    expect(() => ArmySchema.parse({ ...validIdleArmy, manpower: -1 })).toThrow()
  })
})

describe('OrderSchema', () => {
  it('accepts a valid march order', () => {
    expect(() => OrderSchema.parse(validMarchOrder)).not.toThrow()
  })

  it("rejects invalid type 'attack'", () => {
    expect(() => OrderSchema.parse({ ...validMarchOrder, type: 'attack' })).toThrow()
  })

  it('rejects missing armyId', () => {
    expect(() => OrderSchema.parse({ type: 'march', targetSiteId: 'site_2' })).toThrow()
  })
})

describe('ArmyStateSchema', () => {
  it("accepts 'idle'", () => {
    expect(() => ArmyStateSchema.parse('idle')).not.toThrow()
  })

  it("accepts 'engaged'", () => {
    expect(() => ArmyStateSchema.parse('engaged')).not.toThrow()
  })

  it("accepts 'besieging'", () => {
    expect(() => ArmyStateSchema.parse('besieging')).not.toThrow()
  })

  it("accepts 'blocked'", () => {
    expect(() => ArmyStateSchema.parse('blocked')).not.toThrow()
  })

  it("rejects unknown state 'fighting'", () => {
    expect(() => ArmyStateSchema.parse('fighting')).toThrow()
  })
})

describe('M2 contract schemas', () => {
  const validDate = { yearBC: 260, season: 'spring' as const, month: 1 as const, xun: 'shang' as const }

  it('accepts valid RealmStats', () => {
    expect(() => RealmStatsSchema.parse({ manpowerPool: 1000, manpowerCap: 5000, warWeariness: 0 })).not.toThrow()
  })

  it('rejects RealmStats with negative manpowerPool', () => {
    expect(() => RealmStatsSchema.parse({ manpowerPool: -1, manpowerCap: 5000, warWeariness: 0 })).toThrow()
  })

  it('accepts valid AdjacencyEdge', () => {
    expect(() => AdjacencyEdgeSchema.parse({ id: 'ae_1', fromSiteId: 'site_1', toSiteId: 'site_2', passId: 'pass_1' })).not.toThrow()
  })

  it('rejects AdjacencyEdge missing passId', () => {
    expect(() => AdjacencyEdgeSchema.parse({ id: 'ae_1', fromSiteId: 'site_1', toSiteId: 'site_2' })).toThrow()
  })

  it('accepts valid General', () => {
    expect(() => GeneralSchema.parse({ id: 'general_1', realmId: 'realm_qin', name: '王翦', might: 20, command: 12000, loyalty: 100 })).not.toThrow()
  })

  it('rejects General with might above 30', () => {
    expect(() => GeneralSchema.parse({ id: 'general_1', realmId: 'realm_qin', name: '王翦', might: 31, command: 12000, loyalty: 100 })).toThrow()
  })

  it('accepts valid SiteOccupation', () => {
    expect(() => SiteOccupationSchema.parse({ occupierId: 'realm_qin', controlLevel: 50 })).not.toThrow()
  })

  it('rejects SiteOccupation with controlLevel above 100', () => {
    expect(() => SiteOccupationSchema.parse({ occupierId: 'realm_qin', controlLevel: 101 })).toThrow()
  })

  it('accepts valid cession PeaceTerm', () => {
    expect(() => PeaceTermSchema.parse({ type: 'cession', payload: { siteIds: ['site_1'] } })).not.toThrow()
  })

  it('rejects cession PeaceTerm missing payload', () => {
    expect(() => PeaceTermSchema.parse({ type: 'cession' })).toThrow()
  })

  it('accepts valid indemnity PeaceTerm', () => {
    expect(() => PeaceTermSchema.parse({ type: 'indemnity', payload: { amount: 100 } })).not.toThrow()
  })

  it('rejects indemnity PeaceTerm with negative amount', () => {
    expect(() => PeaceTermSchema.parse({ type: 'indemnity', payload: { amount: -1 } })).toThrow()
  })

  it('accepts pending PeaceProposal', () => {
    expect(() => PeaceProposalSchema.parse({ id: 'peace_1', proposingRealmId: 'realm_qin', targetRealmId: 'realm_han', terms: [{ type: 'cession', payload: { siteIds: ['site_1'] } }], proposedAt: validDate, status: 'pending', acknowledgedAt: null })).not.toThrow()
  })

  it('accepts accepted PeaceProposal with acknowledgedAt', () => {
    expect(() => PeaceProposalSchema.parse({ id: 'peace_1', proposingRealmId: 'realm_qin', targetRealmId: 'realm_han', terms: [{ type: 'tribute', payload: { amountPerYear: 10, years: 2 } }], proposedAt: validDate, status: 'accepted', acknowledgedAt: validDate })).not.toThrow()
  })

  it('accepts valid Pass', () => {
    expect(() => PassSchema.parse({ id: 'pass_1', name: '函谷关', edgeId: 'ae_1', defenseBonus: 0.6, controllerId: 'realm_qin', fortification: 50 })).not.toThrow()
  })

  it('rejects Pass with defenseBonus above 1', () => {
    expect(() => PassSchema.parse({ id: 'pass_1', name: '函谷关', edgeId: 'ae_1', defenseBonus: 1.1, controllerId: 'realm_qin', fortification: 50 })).toThrow()
  })
})
