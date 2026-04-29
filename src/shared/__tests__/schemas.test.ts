import { describe, it, expect } from 'vitest'
import {
  ArmySchema,
  ArmyStateSchema,
  M0DataSchema,
  MapEdgeSchema,
  OrderSchema,
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

  it("rejects 'engaged'", () => {
    expect(() => ArmyStateSchema.parse('engaged')).toThrow()
  })

  it("rejects 'fighting'", () => {
    expect(() => ArmyStateSchema.parse('fighting')).toThrow()
  })
})
