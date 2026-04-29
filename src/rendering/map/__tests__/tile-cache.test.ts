import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildTileCache, buildSmoothPath } from '../tile-cache'
import type { Site, Faction } from '@/shared/types'

// jsdom 的 canvas 不支持 getContext('2d') — 需要 mock
class MockPath2D {
  moveTo = vi.fn()
  quadraticCurveTo = vi.fn()
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
    moveTo: vi.fn(),
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
    { id, name: id, position: [50, 50] as const, boundary: [], polygon: poly, adjacency: [], ownerId: 'faction_blue' } satisfies Site,
  ]))
}

function makeFactions(): ReadonlyMap<string, Faction> {
  return new Map([
    ['faction_red', { id: 'faction_red', displayName: '红', color: '#dc2626' }],
    ['faction_blue', { id: 'faction_blue', displayName: '蓝', color: '#2563eb' }],
  ])
}

describe('buildTileCache', () => {
  it('creates 5 × 2 = 10 canvas tiles', () => {
    const cache = buildTileCache(makeSites(), makeFactions())
    expect(cache.size).toBe(5)
    for (const [, siteCache] of cache) {
      expect(siteCache.size).toBe(2)
    }
  })

  it('each canvas has correct dimensions (800×600)', () => {
    const cache = buildTileCache(makeSites(), makeFactions())
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
    buildTileCache(makeSites(), makeFactions())
    // 5 sites × 2 factions = 10 tiles, each calls fill once
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
