import { describe, expect, it } from 'vitest'

import { loadM1Data } from '~/engine/world/factory'
import type { RealmId, SiteId } from '~/shared/types'

import { computeRealmAdjacency } from '../adjacency'

describe('computeRealmAdjacency', () => {
  it('returns an empty map when there are no sites', () => {
    const result = computeRealmAdjacency([], {})
    expect(result.size).toBe(0)
  })

  it('skips edges shared by sites of the same realm (no self-adjacency)', () => {
    const sites = [
      { id: 'site_1', boundary: [{ edge: 'edge_1' }] },
      { id: 'site_2', boundary: [{ edge: 'edge_1' }] },
    ]
    const ownership: Record<SiteId, RealmId> = {
      site_1: 'realm_a',
      site_2: 'realm_a',
    }
    const result = computeRealmAdjacency(sites, ownership)
    expect(result.size).toBe(0)
  })

  it('skips edges where one or both sites have no ownership entry', () => {
    const sites = [
      { id: 'site_1', boundary: [{ edge: 'edge_1' }] },
      { id: 'site_2', boundary: [{ edge: 'edge_1' }] },
    ]
    const ownership: Record<SiteId, RealmId> = {
      site_1: 'realm_a',
    }
    const result = computeRealmAdjacency(sites, ownership)
    expect(result.size).toBe(0)
  })

  it('detects cross-realm adjacency from a shared edge (bidirectional)', () => {
    const sites = [
      { id: 'site_a', boundary: [{ edge: 'edge_ab' }, { edge: 'edge_ac' }] },
      { id: 'site_b', boundary: [{ edge: 'edge_ab' }] },
      { id: 'site_c', boundary: [{ edge: 'edge_ac' }] },
    ]
    const ownership: Record<SiteId, RealmId> = {
      site_a: 'realm_a',
      site_b: 'realm_b',
      site_c: 'realm_c',
    }
    const result = computeRealmAdjacency(sites, ownership)
    expect(result.get('realm_a')).toEqual(new Set(['realm_b', 'realm_c']))
    expect(result.get('realm_b')).toEqual(new Set(['realm_a']))
    expect(result.get('realm_c')).toEqual(new Set(['realm_a']))
  })

  it('skips edges referenced by != 2 sites (1 or 3+)', () => {
    const sites = [
      { id: 'site_a', boundary: [{ edge: 'edge_solo' }, { edge: 'edge_triple' }] },
      { id: 'site_b', boundary: [{ edge: 'edge_triple' }] },
      { id: 'site_c', boundary: [{ edge: 'edge_triple' }] },
    ]
    const ownership: Record<SiteId, RealmId> = {
      site_a: 'realm_a',
      site_b: 'realm_b',
      site_c: 'realm_c',
    }
    const result = computeRealmAdjacency(sites, ownership)
    expect(result.size).toBe(0)
  })

  it('is deterministic: two calls with the same input return identical structure', () => {
    const sites = [
      { id: 'site_a', boundary: [{ edge: 'e1' }, { edge: 'e2' }] },
      { id: 'site_b', boundary: [{ edge: 'e1' }] },
      { id: 'site_c', boundary: [{ edge: 'e2' }] },
    ]
    const ownership: Record<SiteId, RealmId> = {
      site_a: 'realm_z',
      site_b: 'realm_a',
      site_c: 'realm_m',
    }
    const a = computeRealmAdjacency(sites, ownership)
    const b = computeRealmAdjacency(sites, ownership)

    const aKeys = [...a.keys()]
    const bKeys = [...b.keys()]
    expect(aKeys).toEqual(bKeys)

    for (const key of aKeys) {
      expect([...a.get(key)!]).toEqual([...b.get(key)!])
    }
  })

  it('returns realm keys in lexicographic order (determinism contract)', () => {
    const sites = [
      { id: 'site_a', boundary: [{ edge: 'e1' }, { edge: 'e2' }] },
      { id: 'site_b', boundary: [{ edge: 'e1' }] },
      { id: 'site_c', boundary: [{ edge: 'e2' }] },
    ]
    const ownership: Record<SiteId, RealmId> = {
      site_a: 'realm_z',
      site_b: 'realm_a',
      site_c: 'realm_m',
    }
    const result = computeRealmAdjacency(sites, ownership)
    const keys = [...result.keys()]
    expect(keys).toEqual(['realm_a', 'realm_m', 'realm_z'])
  })

  it('does not mutate input parameters', () => {
    const sites = [
      { id: 'site_a', boundary: [{ edge: 'edge_ab' }] },
      { id: 'site_b', boundary: [{ edge: 'edge_ab' }] },
    ]
    const ownership: Record<SiteId, RealmId> = {
      site_a: 'realm_a',
      site_b: 'realm_b',
    }
    const sitesSnapshot = JSON.stringify(sites)
    const ownershipSnapshot = JSON.stringify(ownership)
    computeRealmAdjacency(sites, ownership)
    expect(JSON.stringify(sites)).toBe(sitesSnapshot)
    expect(JSON.stringify(ownership)).toBe(ownershipSnapshot)
  })

  it('M1 scenario: realm_qin is adjacent to realm_wei, realm_zhao, and realm_han', () => {
    const data = loadM1Data()
    const result = computeRealmAdjacency(data.sites, data.initialOwnership)

    const qinNeighbors = result.get('realm_qin')
    expect(qinNeighbors).toBeDefined()
    expect(qinNeighbors!.size).toBeGreaterThanOrEqual(2)
    const expectedAny = ['realm_wei', 'realm_zhao', 'realm_han']
    const matched = expectedAny.filter(r => qinNeighbors!.has(r))
    expect(matched.length).toBeGreaterThanOrEqual(2)
  })

  it('M1 scenario: adjacency relation is symmetric', () => {
    const data = loadM1Data()
    const result = computeRealmAdjacency(data.sites, data.initialOwnership)

    for (const [realmA, neighbors] of result) {
      for (const realmB of neighbors) {
        const reverse = result.get(realmB)
        expect(reverse, `${realmB} should have entry`).toBeDefined()
        expect(reverse!.has(realmA), `${realmB} should be adjacent back to ${realmA}`).toBe(true)
      }
    }
  })
})
