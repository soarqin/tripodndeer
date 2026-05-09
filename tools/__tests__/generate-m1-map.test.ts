import { describe, it, expect } from 'vitest'
import scenarioJson from '../../src/content/m1/scenario.json'

type JsonEdge = { id: string; curveType: string; travel_cost: number; anchors: unknown[]; controls?: unknown[] }
type JsonSite = { id: string; name: string; position: [number, number]; boundary: Array<{ edge: string; reverse: boolean }> }
type JsonRealm = {
  id: string
  displayName: string
  fullTitle: string
  color: string
  capital: string
  initialSites: string[]
  initialArmies: Array<{ id: string; manpower: number; location: string }>
}

const sites = scenarioJson.sites as JsonSite[]
const realms = scenarioJson.realms as JsonRealm[]
const edges = scenarioJson.edges as Record<string, JsonEdge>
const ownership = scenarioJson.initialOwnership as Record<string, string>

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildAdjacency(): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>()
  for (const site of sites) adjacency.set(site.id, new Set())

  const edgeToSites = new Map<string, string[]>()
  for (const site of sites) {
    for (const ref of site.boundary) {
      const list = edgeToSites.get(ref.edge) ?? []
      list.push(site.id)
      edgeToSites.set(ref.edge, list)
    }
  }

  for (const [, ids] of edgeToSites) {
    if (ids.length === 2) {
      adjacency.get(ids[0]!)!.add(ids[1]!)
      adjacency.get(ids[1]!)!.add(ids[0]!)
    }
  }
  return adjacency
}

function bfsVisitCount(start: string): number {
  const adjacency = buildAdjacency()
  const visited = new Set<string>()
  const queue = [start]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) queue.push(neighbor)
    }
  }
  return visited.size
}

function realmSiteCounts(): Map<string, number> {
  const counts = new Map<string, number>()
  for (const realmId of Object.values(ownership)) {
    counts.set(realmId, (counts.get(realmId) ?? 0) + 1)
  }
  return counts
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('M1 scenario.json: counts and structure', () => {
  it('has exactly 50 sites', () => {
    expect(sites.length).toBe(50)
  })

  it('has exactly 8 realms', () => {
    expect(realms.length).toBe(8)
  })

  it('top-level initialArmies and initialWars are empty arrays', () => {
    expect(scenarioJson.initialArmies).toEqual([])
    expect(scenarioJson.initialWars).toEqual([])
  })

  it('all 8 expected realm ids exist', () => {
    const expectedIds = ['realm_qin', 'realm_chu', 'realm_qi', 'realm_yan', 'realm_han', 'realm_zhao', 'realm_wei', 'realm_zhou']
    const actualIds = realms.map(r => r.id).sort()
    expect(actualIds).toEqual(expectedIds.sort())
  })

  it('every site has a realm assigned (initialOwnership covers all)', () => {
    for (const site of sites) {
      expect(ownership[site.id], `Site ${site.id} ownership`).toBeDefined()
    }
  })
})

describe('M1 scenario.json: edge invariants', () => {
  it('all edges have travel_cost >= 1', () => {
    const edgeArr = Object.values(edges)
    expect(edgeArr.length).toBeGreaterThan(0)
    expect(edgeArr.every(e => typeof e.travel_cost === 'number' && e.travel_cost >= 1)).toBe(true)
  })

  it('each shared edge is referenced by exactly 2 sites', () => {
    const edgeRefs = new Map<string, number>()
    for (const site of sites) {
      for (const ref of site.boundary) {
        edgeRefs.set(ref.edge, (edgeRefs.get(ref.edge) ?? 0) + 1)
      }
    }
    for (const [eid, count] of edgeRefs) {
      expect(count, `Edge ${eid} referenced by ${count} sites`).toBeLessThanOrEqual(2)
    }
  })

  it('cubic-bezier edges have controls.length === anchors.length - 1', () => {
    for (const [eid, edge] of Object.entries(edges)) {
      if (edge.curveType === 'cubic-bezier') {
        expect(edge.controls?.length, `Edge ${eid}`).toBe(edge.anchors.length - 1)
      }
    }
  })
})

describe('M1 scenario.json: BFS connectivity', () => {
  it('all sites are reachable from site_001', () => {
    expect(bfsVisitCount(sites[0]!.id)).toBe(sites.length)
  })
})

describe('M1 scenario.json: realm site distribution', () => {
  it('Zhou has at least 1 site', () => {
    const counts = realmSiteCounts()
    expect(counts.get('realm_zhou') ?? 0).toBeGreaterThanOrEqual(1)
  })

  it('each major realm (non-Zhou) has at least 5 sites', () => {
    const counts = realmSiteCounts()
    for (const realm of realms) {
      if (realm.id === 'realm_zhou') continue
      const count = counts.get(realm.id) ?? 0
      expect(count, `Realm ${realm.id} site count`).toBeGreaterThanOrEqual(5)
    }
  })
})

describe('M1 scenario.json: geographic constraints', () => {
  it('Qin is in the west (avg x < 0.5 * width)', () => {
    const qinSites = sites.filter(s => ownership[s.id] === 'realm_qin')
    expect(qinSites.length).toBeGreaterThan(0)
    const avgX = qinSites.reduce((sum, s) => sum + s.position[0], 0) / qinSites.length
    expect(avgX).toBeLessThan(800 * 0.5)
  })

  it('Chu is in the south (avg y > 0.5 * height)', () => {
    const chuSites = sites.filter(s => ownership[s.id] === 'realm_chu')
    expect(chuSites.length).toBeGreaterThan(0)
    const avgY = chuSites.reduce((sum, s) => sum + s.position[1], 0) / chuSites.length
    expect(avgY).toBeGreaterThan(600 * 0.5)
  })

  it('Yan is in the north (avg y < 0.5 * height)', () => {
    const yanSites = sites.filter(s => ownership[s.id] === 'realm_yan')
    expect(yanSites.length).toBeGreaterThan(0)
    const avgY = yanSites.reduce((sum, s) => sum + s.position[1], 0) / yanSites.length
    expect(avgY).toBeLessThan(600 * 0.5)
  })

  it('Qi is in the east (avg x > 0.5 * width)', () => {
    const qiSites = sites.filter(s => ownership[s.id] === 'realm_qi')
    expect(qiSites.length).toBeGreaterThan(0)
    const avgX = qiSites.reduce((sum, s) => sum + s.position[0], 0) / qiSites.length
    expect(avgX).toBeGreaterThan(800 * 0.5)
  })
})

describe('M1 scenario.json: realm army & capital invariants', () => {
  it('each realm has exactly 2 initial armies with manpower 5000', () => {
    for (const realm of realms) {
      expect(realm.initialArmies.length, `Realm ${realm.id} army count`).toBe(2)
      for (const army of realm.initialArmies) {
        expect(army.manpower).toBe(5000)
        expect(typeof army.id).toBe('string')
        expect(typeof army.location).toBe('string')
      }
    }
  })

  it('each realm capital is among its initialSites', () => {
    for (const realm of realms) {
      expect(realm.initialSites).toContain(realm.capital)
    }
  })

  it('each realm initialArmies reference sites the realm owns', () => {
    for (const realm of realms) {
      for (const army of realm.initialArmies) {
        expect(realm.initialSites, `Realm ${realm.id} army ${army.id} location`).toContain(army.location)
      }
    }
  })
})
