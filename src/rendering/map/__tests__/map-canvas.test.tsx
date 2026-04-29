import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { MapCanvas } from '../MapCanvas'

// Mock store selectors
vi.mock('@/ui/store/selectors', () => ({
  useSites: () => new Map(),
  useFactions: () => new Map(),
}))

beforeAll(() => {
  // Mock getContext to avoid jsdom error
  HTMLCanvasElement.prototype.getContext = vi.fn() as unknown as typeof HTMLCanvasElement.prototype.getContext
})

describe('MapCanvas', () => {
  it('renders a canvas element', () => {
    const { container } = render(<MapCanvas />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
    expect(canvas?.getAttribute('data-testid')).toBe('map-canvas')
  })

  it('has correct dimensions', () => {
    const { container } = render(<MapCanvas />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
  })
})
