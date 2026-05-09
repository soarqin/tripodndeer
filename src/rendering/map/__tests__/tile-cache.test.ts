import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildTileCache, buildSmoothPath, buildSitePathFromBoundary } from '../tile-cache'
import type { Site, Realm, MapEdge } from '@/shared/types'

// jsdom 的 canvas 不支持 getContext('2d') — 需要 mock
class MockPath2D {
  moveTo = vi.fn()
  lineTo = vi.fn()
  quadraticCurveTo = vi.fn()
  bezierCurveTo = vi.fn()
  closePath = vi.fn()
}
global.Path2D = MockPath2D as unknown as typeof Path2D

beforeEach(() => {
  const mockCtx = {
    clearRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D)
})

// Fixture: 5 sites with minimal polygons
function makeSites(): ReadonlyMap<string, Site> {
  const poly: readonly (readonly [number, number])[] = [
    [0, 0], [100, 0], [100, 100], [50, 150], [0, 100],
  ]
  const ids = ['site_1', 'site_2', 'site_3', 'site_4', 'site_5']
  return new Map(ids.map(id => [
    id,
    { id, name: id, position: [50, 50] as const, boundary: [], polygon: poly, adjacency: [], ownerId: 'realm_blue', economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 } } satisfies Site,
  ]))
}

function makeRealms(): ReadonlyMap<string, Realm> {
  return new Map([
    ['realm_red', { id: 'realm_red', displayName: '红', fullTitle: '红方', color: '#dc2626', capital: 'site_1', initialSites: ['site_1'], initialArmies: [], economy: { treasury: 0, foodStores: 0, taxRate: 10 }, traits: [], politicalSystem: 'enfeoffment' }],
    ['realm_blue', { id: 'realm_blue', displayName: '蓝', fullTitle: '蓝方', color: '#2563eb', capital: 'site_2', initialSites: ['site_2'], initialArmies: [], economy: { treasury: 0, foodStores: 0, taxRate: 10 }, traits: [], politicalSystem: 'enfeoffment' }],
  ])
}

function makeEdges(): ReadonlyMap<string, MapEdge> {
  return new Map()
}

describe('buildTileCache', () => {
  it('creates 5 × 2 = 10 canvas tiles', () => {
    const cache = buildTileCache(makeSites(), makeRealms(), makeEdges())
    expect(cache.size).toBe(5)
    for (const [, siteCache] of cache) {
      expect(siteCache.size).toBe(2)
    }
  })

  it('each canvas has correct dimensions (800×600)', () => {
    const cache = buildTileCache(makeSites(), makeRealms(), makeEdges())
    for (const [, siteCache] of cache) {
      for (const [, canvas] of siteCache) {
        expect(canvas.width).toBe(800)
        expect(canvas.height).toBe(600)
      }
    }
  })

  it('calls fill() for each tile (canvas drawing happens)', () => {
    const getContextMock = vi.mocked(HTMLCanvasElement.prototype.getContext)
    const mockCtx = getContextMock.mock.results[0]?.value || getContextMock('2d')
    buildTileCache(makeSites(), makeRealms(), makeEdges())
    // 5 sites × 2 realms = 10 tiles, each calls fill once
    expect((mockCtx as { fill: ReturnType<typeof vi.fn> }).fill).toHaveBeenCalledTimes(10)
  })
})

describe('buildSmoothPath', () => {
  it('returns empty Path2D for degenerate polygon', () => {
    const path = buildSmoothPath([[0, 0], [1, 1]])
    expect(path).toBeInstanceOf(Path2D)
  })

  it('returns Path2D for valid polygon', () => {
    const poly: readonly (readonly [number, number])[] = [
      [0, 0], [100, 0], [100, 100], [0, 100],
    ]
    const path = buildSmoothPath(poly)
    expect(path).toBeInstanceOf(Path2D)
  })
})

describe('buildSitePathFromBoundary', () => {
  it('builds path with lineTo for polyline edges', () => {
    const edges = new Map<string, MapEdge>([
      ['e1', { id: 'e1', curveType: 'polyline', travel_cost: 1, anchors: [[0, 0], [100, 0]] }],
    ])
    const site: Site = {
      id: 's1', name: 's1', position: [50, 50],
      boundary: [{ edge: 'e1', reverse: false }],
      polygon: [], adjacency: [], ownerId: null,
      economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
    }
    const path = buildSitePathFromBoundary(site, edges) as unknown as MockPath2D
    expect(path.moveTo).toHaveBeenCalledWith(0, 0)
    expect(path.lineTo).toHaveBeenCalledWith(100, 0)
  })

  it('builds path with bezierCurveTo for cubic-bezier edges', () => {
    const edges = new Map<string, MapEdge>([
      ['e1', {
        id: 'e1', curveType: 'cubic-bezier', travel_cost: 1,
        anchors: [[0, 0], [100, 0]],
        controls: [[[25, 25], [75, -25]]],
      }],
    ])
    const site: Site = {
      id: 's1', name: 's1', position: [50, 50],
      boundary: [{ edge: 'e1', reverse: false }],
      polygon: [], adjacency: [], ownerId: null,
      economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
    }
    const path = buildSitePathFromBoundary(site, edges) as unknown as MockPath2D
    expect(path.moveTo).toHaveBeenCalledWith(0, 0)
    expect(path.bezierCurveTo).toHaveBeenCalledWith(25, 25, 75, -25, 100, 0)
  })
})

describe('buildSitePathFromBoundary reverse', () => {
  it('reverses bezier controls correctly', () => {
    const edges = new Map<string, MapEdge>([
      ['e1', {
        id: 'e1', curveType: 'cubic-bezier', travel_cost: 1,
        anchors: [[0, 0], [100, 0]],
        controls: [[[25, 25], [75, -25]]],
      }],
    ])
    const site: Site = {
      id: 's1', name: 's1', position: [50, 50],
      boundary: [{ edge: 'e1', reverse: true }],
      polygon: [], adjacency: [], ownerId: null,
      economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 },
    }
    const path = buildSitePathFromBoundary(site, edges) as unknown as MockPath2D
    expect(path.moveTo).toHaveBeenCalledWith(100, 0)
    // When reversed, C1 and C2 are swapped, and the order of segments is reversed
    expect(path.bezierCurveTo).toHaveBeenCalledWith(75, -25, 25, 25, 0, 0)
  })
})
