import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MapCanvas } from '../MapCanvas'

// Mock store selectors
vi.mock('@/ui/store/selectors', () => ({
  useSites: () => new Map(),
  useFactions: () => new Map(),
}))

// Mock tile-cache to avoid real canvas operations
vi.mock('../tile-cache', () => ({
  buildTileCache: () => new Map(),
  buildSmoothPath: vi.fn(),
}))

// Mock canvas context
beforeEach(() => {
  const mockCtx = {
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D
  )
})

describe('MapCanvas', () => {
  it('renders a canvas element with correct testid', () => {
    const { container } = render(<MapCanvas />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
    expect(canvas?.getAttribute('data-testid')).toBe('map-canvas')
  })

  it('has correct dimensions (800×600)', () => {
    const { container } = render(<MapCanvas />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
  })
})
