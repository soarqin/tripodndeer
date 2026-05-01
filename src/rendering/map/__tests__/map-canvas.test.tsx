import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MapCanvas } from '../MapCanvas'
import type { AdjacencyEdge, Pass, Polygon, Site } from '@/shared/types'

type SiteMock = Partial<Site> & { id: string; polygon: Polygon }

// Hoisted mocks so vi.mock factory can reference them.
const {
  mockSelectArmy,
  mockClearSelection,
  mockOpenContextMenu,
  mockSites,
  mockArmies,
  mockPasses,
  mockAdjacencyEdges,
} = vi.hoisted(() => {
  const polygon: Polygon = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ]
  const siteA: SiteMock = {
    id: 'site_a',
    name: 'Site A',
    polygon,
    boundary: [],
    position: [50, 50],
    ownerId: null,
    adjacency: [],
  }
  const siteB: SiteMock = {
    id: 'site_b',
    name: 'Site B',
    polygon,
    boundary: [],
    position: [150, 50],
    ownerId: null,
    adjacency: [],
  }
  const sites = new Map<string, SiteMock>([['site_a', siteA], ['site_b', siteB]])
  // Two armies — only player's qualifies for hit.
  const armies = new Map<string, { id: string; realmId: string; location: string }>([
    ['army_enemy', { id: 'army_enemy', realmId: 'realm_chu', location: 'site_a' }],
    ['army_player', { id: 'army_player', realmId: 'realm_qin', location: 'site_a' }],
  ])
  const passes = new Map<string, Pass>([
    ['pass_1', { id: 'pass_1', name: 'Hangu Pass', edgeId: 'ae_1', defenseBonus: 0.5, controllerId: 'realm_qin', fortification: 0 } as Pass]
  ])
  const adjacencyEdges = new Map<string, AdjacencyEdge>([
    ['ae_1', { id: 'ae_1', fromSiteId: 'site_a', toSiteId: 'site_b', passId: 'pass_1' } as AdjacencyEdge]
  ])
  return {
    mockSelectArmy: vi.fn(),
    mockClearSelection: vi.fn(),
    mockOpenContextMenu: vi.fn(),
    mockSites: sites,
    mockArmies: armies,
    mockPasses: passes,
    mockAdjacencyEdges: adjacencyEdges,
  }
})

// Mock store selectors
vi.mock('@/ui/store/selectors', () => ({
  useSites: () => mockSites,
  useRealms: () => new Map(),
  useEdges: () => new Map(),
}))

// Mock game-store with getState returning fake actions + world slice.
vi.mock('@/ui/store/game-store', () => {
  const storeState = {
    selectArmy: mockSelectArmy,
    clearSelection: mockClearSelection,
    openContextMenu: mockOpenContextMenu,
    playerRealmId: 'realm_qin',
    world: { 
      armies: mockArmies,
      passes: mockPasses,
      adjacencyEdges: mockAdjacencyEdges,
    },
    selectedArmyId: null,
  }
  const useGameStore = vi.fn((selector) => selector(storeState))
  Object.assign(useGameStore, { getState: () => storeState })
  return { useGameStore }
})

// Mock tile-cache to avoid real canvas operations
vi.mock('../tile-cache', () => ({
  buildTileCache: () => new Map(),
  buildSmoothPath: vi.fn(),
}))

// Mock canvas context
beforeEach(() => {
  mockSelectArmy.mockClear()
  mockClearSelection.mockClear()
  mockOpenContextMenu.mockClear()
  const mockCtx = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D
  )
  // jsdom's getBoundingClientRect is all-zeros by default, so clientX/clientY
  // map directly to canvas-local coordinates — fine for our tests.
})

function renderCanvas(): HTMLCanvasElement {
  const { container } = render(<MapCanvas />)
  return container.querySelector('canvas') as HTMLCanvasElement
}

describe('MapCanvas (rendering)', () => {
  it('renders a canvas element with correct testid', () => {
    const canvas = renderCanvas()
    expect(canvas).toBeTruthy()
    expect(canvas.getAttribute('data-testid')).toBe('map-canvas')
  })

  it('has correct dimensions (800×600)', () => {
    const canvas = renderCanvas()
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
  })

  it('renders pass icons at the midpoint of adjacency edges', () => {
    const canvas = renderCanvas()
    const ctx = canvas.getContext('2d') as unknown as { fillRect: Mock; strokeRect: Mock }
    
    // Midpoint of site A (50, 50) and site B (150, 50) is (100, 50)
    // The pass icon is drawn with fillRect(cx - 4, cy - 2, 8, 6)
    expect(ctx.fillRect).toHaveBeenCalledWith(100 - 4, 50 - 2, 8, 6)
    expect(ctx.strokeRect).toHaveBeenCalledWith(100 - 4, 50 - 2, 8, 6)
  })

  it('shows the active pass tooltip from the current world pass state on hover', () => {
    const { getByText, container } = render(<MapCanvas />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 50 })

    expect(getByText('Hangu Pass | 控制：无 | 防御：+50%')).toBeTruthy()
  })
})

describe('MapCanvas (left click)', () => {
  it('selects the player army when clicking on a site that has one', () => {
    const canvas = renderCanvas()
    fireEvent.click(canvas, { clientX: 50, clientY: 50 })

    expect(mockSelectArmy).toHaveBeenCalledTimes(1)
    expect(mockSelectArmy).toHaveBeenCalledWith('army_player')
    expect(mockClearSelection).not.toHaveBeenCalled()
  })

  it('clears selection when clicking on empty space (no site hit)', () => {
    const canvas = renderCanvas()
    // (200, 200) is outside the site polygon at [0,0]–[100,100]
    fireEvent.click(canvas, { clientX: 200, clientY: 200 })

    expect(mockSelectArmy).not.toHaveBeenCalled()
    expect(mockClearSelection).toHaveBeenCalledTimes(1)
  })
})

describe('MapCanvas (right click)', () => {
  it('opens context menu with siteId and viewport coordinates when right-clicking on a site', () => {
    const canvas = renderCanvas()
    fireEvent.contextMenu(canvas, { clientX: 60, clientY: 70 })

    expect(mockOpenContextMenu).toHaveBeenCalledTimes(1)
    expect(mockOpenContextMenu).toHaveBeenCalledWith({
      siteId: 'site_a',
      x: 60,
      y: 70,
    })
  })

  it('does not open context menu when right-clicking outside any site', () => {
    const canvas = renderCanvas()
    fireEvent.contextMenu(canvas, { clientX: 500, clientY: 500 })

    expect(mockOpenContextMenu).not.toHaveBeenCalled()
  })
})
