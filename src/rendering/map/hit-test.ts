import type { Vec2, Polygon, SiteId } from '~/shared/types'

/**
 * Ray casting algorithm for point-in-polygon test.
 * Returns true if point is inside the polygon.
 *
 * Uses the standard horizontal ray cast — counts edge crossings.
 * Points on the edge are not guaranteed to be inside (boundary
 * behaviour is undefined; acceptable for click hit-testing).
 */
export function pointInPolygon(point: Vec2, polygon: Polygon): boolean {
  const [px, py] = point
  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i]!
    const [xj, yj] = polygon[j]!

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }

  return inside
}

/**
 * Find which site (if any) contains the given canvas point.
 * Returns the SiteId of the hit site, or null if no site was hit.
 *
 * Iteration order follows Map insertion order; first hit wins.
 */
export function findHitSite(
  point: Vec2,
  sites: ReadonlyMap<SiteId, { polygon: Polygon }>,
): SiteId | null {
  for (const [siteId, site] of sites) {
    if (pointInPolygon(point, site.polygon)) {
      return siteId
    }
  }
  return null
}
