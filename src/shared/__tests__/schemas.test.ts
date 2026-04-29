import { describe, it, expect } from 'vitest'
import { M0DataSchema, MapEdgeSchema } from '../schemas'

const validPolylineEdge = {
  id: 'e_001',
  curveType: 'polyline' as const,
  anchors: [[0, 0], [100, 50], [200, 0]] as const,
}
const validBezierEdge = {
  id: 'e_002',
  curveType: 'cubic-bezier' as const,
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
const validFaction = {
  id: 'faction_red',
  displayName: '红',
  color: '#dc2626',
}
const validData = {
  edges: { e_001: validPolylineEdge, e_002: validBezierEdge, e_003: validPolylineEdge },
  sites: [validSite],
  factions: [validFaction],
  initialOwnership: { site_1: 'faction_red' },
}

describe('MapEdgeSchema valid', () => {
  it('accepts polyline edge', () => {
    expect(() => MapEdgeSchema.parse(validPolylineEdge)).not.toThrow()
  })

  it('accepts cubic-bezier edge with correct controls', () => {
    expect(() => MapEdgeSchema.parse(validBezierEdge)).not.toThrow()
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
