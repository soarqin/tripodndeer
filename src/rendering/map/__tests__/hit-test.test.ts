import { describe, it, expect } from 'vitest'
import { pointInPolygon, findHitSite } from '../hit-test'
import type { Polygon, Vec2 } from '~/shared/types'

// Simple square polygon: (0,0), (10,0), (10,10), (0,10)
const SQUARE: Polygon = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
]

// L-shape — the (5..10, 5..10) quadrant is the notch (outside).
const L_SHAPE: Polygon = [
  [0, 0],
  [10, 0],
  [10, 5],
  [5, 5],
  [5, 10],
  [0, 10],
]

describe('pointInPolygon (convex square)', () => {
  it('returns true for center point', () => {
    expect(pointInPolygon([5, 5], SQUARE)).toBe(true)
  })

  it('returns false for point outside (right)', () => {
    expect(pointInPolygon([15, 5], SQUARE)).toBe(false)
  })

  it('returns false for point above', () => {
    expect(pointInPolygon([5, -1], SQUARE)).toBe(false)
  })

  it('returns false for point to the left', () => {
    expect(pointInPolygon([-1, 5], SQUARE)).toBe(false)
  })

  it('returns true for point near corner (inside)', () => {
    expect(pointInPolygon([1, 1], SQUARE)).toBe(true)
  })

  it('returns false for point at far corner (outside)', () => {
    expect(pointInPolygon([11, 11], SQUARE)).toBe(false)
  })
})

describe('pointInPolygon (edge cases)', () => {
  it('handles concave polygon (L-shape, body inside)', () => {
    expect(pointInPolygon([2, 8], L_SHAPE)).toBe(true)
  })

  it('handles concave polygon (L-shape, notch outside)', () => {
    expect(pointInPolygon([8, 8], L_SHAPE)).toBe(false)
  })

  it('returns false for empty polygon', () => {
    expect(pointInPolygon([0, 0], [])).toBe(false)
  })
})

const SITE_B_POLY: Polygon = [
  [20, 0],
  [30, 0],
  [30, 10],
  [20, 10],
]
const TWO_SITES = new Map<string, { polygon: Polygon }>([
  ['site_a', { polygon: SQUARE }],
  ['site_b', { polygon: SITE_B_POLY }],
])

describe('findHitSite', () => {
  it('returns siteId when point is inside a site', () => {
    const p: Vec2 = [5, 5]
    expect(findHitSite(p, TWO_SITES)).toBe('site_a')
  })

  it('returns null when point is in empty space', () => {
    const p: Vec2 = [15, 5]
    expect(findHitSite(p, TWO_SITES)).toBe(null)
  })

  it('returns the second site when point is inside it', () => {
    const p: Vec2 = [25, 5]
    expect(findHitSite(p, TWO_SITES)).toBe('site_b')
  })
})
