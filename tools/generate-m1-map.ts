import * as fs from 'fs'
import * as path from 'path'
import { Delaunay } from 'd3-delaunay'

// ─── Constants ────────────────────────────────────────────────────────────────
const WIDTH = 800
const HEIGHT = 600
const N_SITES = 50
const N_REALMS = 8
const LLOYD_ITER = 4
const N_SUBDIV = 4
const NOISE_RATIO = 0.08
const SEED = 0xc0ffee

// ─── Realm Definitions ───────────────────────────────────────────────────────
type RealmDef = {
  id: string
  displayName: string
  fullTitle: string
  color: string
  aiPersonality: 'aggressive_random'
}

const REALMS: readonly RealmDef[] = [
  { id: 'realm_qin', displayName: '秦', fullTitle: '秦国', color: '#1A1A1A', aiPersonality: 'aggressive_random' },
  { id: 'realm_chu', displayName: '楚', fullTitle: '楚国', color: '#8B1A1A', aiPersonality: 'aggressive_random' },
  { id: 'realm_qi', displayName: '齐', fullTitle: '齐国', color: '#2E5A6E', aiPersonality: 'aggressive_random' },
  { id: 'realm_yan', displayName: '燕', fullTitle: '燕国', color: '#B0B0B0', aiPersonality: 'aggressive_random' },
  { id: 'realm_han', displayName: '韩', fullTitle: '韩国', color: '#D8741A', aiPersonality: 'aggressive_random' },
  { id: 'realm_zhao', displayName: '赵', fullTitle: '赵国', color: '#5B3A6F', aiPersonality: 'aggressive_random' },
  { id: 'realm_wei', displayName: '魏', fullTitle: '魏国', color: '#4A8B5C', aiPersonality: 'aggressive_random' },
  { id: 'realm_zhou', displayName: '周', fullTitle: '周王室', color: '#C8362F', aiPersonality: 'aggressive_random' },
] as const

// ─── Deterministic PRNG ──────────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────
type P = [number, number]
type EdgeEntry = { p1: P; p2: P; cells: number[] }
type BoundaryRef = { edge: string; reverse: boolean }

function dist(a: P, b: P): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)
}

function perpUnit(a: P, b: P): P {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return [-dy / len, dx / len]
}

function centroid(pts: ArrayLike<P | readonly number[]>): P {
  let cx = 0
  let cy = 0
  let n = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!
    cx += p[0]
    cy += p[1]
    n++
  }
  return [cx / n, cy / n]
}

// ─── Canonical edge key (order-independent) ───────────────────────────────────
function r3(n: number): number {
  return Math.round(n * 1000) / 1000
}

function isLexicographicallyBeforeOrEqual(a: P, b: P): boolean {
  return a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1])
}

function canonicalKey(a: P, b: P): string {
  const [p, q] = isLexicographicallyBeforeOrEqual(a, b) ? [a, b] : [b, a]
  return `${r3(p[0])},${r3(p[1])};${r3(q[0])},${r3(q[1])}`
}

function canonicalEndpoints(a: P, b: P): [P, P] {
  return isLexicographicallyBeforeOrEqual(a, b) ? [a, b] : [b, a]
}

// ─── Edge perturbation (canonical direction) ──────────────────────────────────
function edgeRng(p1: P, p2: P): () => number {
  const h =
    (Math.round(p1[0] * 1000) * 73856093) ^
    (Math.round(p1[1] * 1000) * 19349663) ^
    (Math.round(p2[0] * 1000) * 83492791) ^
    (Math.round(p2[1] * 1000) * 59349677)
  return mulberry32(Math.abs(h) || 1)
}

function generateAnchors(canonP1: P, canonP2: P, isShared: boolean): P[] {
  if (!isShared) return [canonP1, canonP2]

  const rng = edgeRng(canonP1, canonP2)
  const len = dist(canonP1, canonP2)
  const perp = perpUnit(canonP1, canonP2)
  const result: P[] = [canonP1]

  for (let j = 1; j < N_SUBDIV; j++) {
    const t = j / N_SUBDIV
    const along: P = [canonP1[0] + (canonP2[0] - canonP1[0]) * t, canonP1[1] + (canonP2[1] - canonP1[1]) * t]
    const amplitude = Math.sin(t * Math.PI) * len * NOISE_RATIO
    const noise = (rng() - 0.5) * 2 * amplitude
    result.push([along[0] + perp[0] * noise, along[1] + perp[1] * noise])
  }

  result.push(canonP2)
  return result
}

// ─── Catmull-Rom → Cubic Bezier conversion ────────────────────────────────────
function catmullRomToBezier(anchors: P[]): Array<[P, P]> {
  const controls: Array<[P, P]> = []

  for (let i = 0; i < anchors.length - 1; i++) {
    const p0 = anchors[Math.max(0, i - 1)]!
    const p1 = anchors[i]!
    const p2 = anchors[i + 1]!
    const p3 = anchors[Math.min(anchors.length - 1, i + 2)]!
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    controls.push([c1, c2])
  }

  return controls
}

// ─── Rounding helpers ─────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function r2p(p: P): [number, number] {
  return [round2(p[0]), round2(p[1])]
}

function r2pair(c: [P, P]): [[number, number], [number, number]] {
  return [r2p(c[0]), r2p(c[1])]
}

// ─── Voronoi generation ──────────────────────────────────────────────────────
function createRelaxedPoints(seed: number): P[] {
  const rng = mulberry32(seed)
  const randRange = (lo: number, hi: number) => lo + rng() * (hi - lo)

  let pts: P[] = Array.from(
    { length: N_SITES },
    () => [randRange(60, WIDTH - 60), randRange(60, HEIGHT - 60)] as P,
  )

  for (let iter = 0; iter < LLOYD_ITER; iter++) {
    const d = Delaunay.from(pts)
    const v = d.voronoi([0, 0, WIDTH, HEIGHT])
    pts = pts.map((fallback, i) => {
      const poly = v.cellPolygon(i)
      return poly ? centroid(poly as P[]) : fallback
    })
  }

  return pts
}

function getCellPolygons(pts: P[]): P[][] {
  const delaunay = Delaunay.from(pts)
  const voronoi = delaunay.voronoi([0, 0, WIDTH, HEIGHT])
  const cellPolys: P[][] = []

  for (let i = 0; i < N_SITES; i++) {
    const poly = voronoi.cellPolygon(i)
    if (!poly) throw new Error(`No polygon for cell ${i}`)
    cellPolys.push((poly as P[]).slice(0, -1))
  }

  return cellPolys
}

function buildEdgeTable(cellPolys: P[][]): Map<string, EdgeEntry> {
  const edgeTable = new Map<string, EdgeEntry>()
  for (let ci = 0; ci < N_SITES; ci++) {
    const poly = cellPolys[ci]!
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k]!
      const b = poly[(k + 1) % poly.length]!
      const key = canonicalKey(a, b)
      if (!edgeTable.has(key)) {
        const [p1, p2] = canonicalEndpoints(a, b)
        edgeTable.set(key, { p1, p2, cells: [] })
      }
      edgeTable.get(key)!.cells.push(ci)
    }
  }

  return edgeTable
}

function buildEdges(edgeTable: Map<string, EdgeEntry>): {
  edges: Record<string, object>
  keyToId: Map<string, string>
} {
  const edges: Record<string, object> = {}
  const keyToId = new Map<string, string>()
  let counter = 1

  for (const [key, entry] of edgeTable) {
    const id = `e_${String(counter++).padStart(3, '0')}`
    keyToId.set(key, id)
    const isShared = entry.cells.length === 2
    const anchors = generateAnchors(entry.p1, entry.p2, isShared)
    const roundedAnchors = anchors.map(r2p)
    const d = dist(entry.p1, entry.p2)
    // M1: travel_cost uses /80 divisor (vs /100 in M0)
    const travel_cost = Math.max(1, Math.round(d / 80))

    if (isShared) {
      edges[id] = {
        id,
        curveType: 'cubic-bezier',
        travel_cost,
        anchors: roundedAnchors,
        controls: catmullRomToBezier(anchors).map(r2pair),
      }
    } else {
      edges[id] = {
        id,
        curveType: 'polyline',
        travel_cost,
        anchors: roundedAnchors,
      }
    }
  }

  return { edges, keyToId }
}

function buildBoundary(poly: P[], keyToId: Map<string, string>): BoundaryRef[] {
  const boundary: BoundaryRef[] = []

  for (let k = 0; k < poly.length; k++) {
    const a = poly[k]!
    const b = poly[(k + 1) % poly.length]!
    const key = canonicalKey(a, b)
    const edgeId = keyToId.get(key)!
    const [canonP1] = canonicalEndpoints(a, b)
    const reverse = !(Math.abs(a[0] - canonP1[0]) < 0.01 && Math.abs(a[1] - canonP1[1]) < 0.01)
    boundary.push({ edge: edgeId, reverse })
  }

  return boundary
}

type BuiltSite = {
  id: string
  name: string
  position: [number, number]
  boundary: BoundaryRef[]
}

function buildSites(cellPolys: P[][], keyToId: Map<string, string>): BuiltSite[] {
  return cellPolys.map((poly, ci) => {
    const id = `site_${String(ci + 1).padStart(3, '0')}`
    return {
      id,
      name: id,
      position: r2p(centroid(poly)),
      boundary: buildBoundary(poly, keyToId),
    }
  })
}

// ─── Adjacency / BFS ──────────────────────────────────────────────────────────
function buildSiteAdjacency(sites: BuiltSite[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>()
  for (const site of sites) {
    adjacency.set(site.id, new Set())
  }

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

function isFullyConnected(sites: BuiltSite[]): boolean {
  if (sites.length === 0) return true
  const adjacency = buildSiteAdjacency(sites)
  const visited = new Set<string>()
  const queue: string[] = [sites[0]!.id]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) queue.push(neighbor)
    }
  }
  return visited.size === sites.length
}

// ─── Realm Assignment (Geographic Partition) ─────────────────────────────────
type RealmAssignment = Map<string, string> // siteId -> realmId

type GeographicPartition = {
  qin: string[]
  chu: string[]
  yan: string[]
  qi: string[]
  central: string[]
}

/**
 * Partition sites into 5 geographic buckets based on centroid position.
 * Priority order: Qin (west) > Chu (south) > Yan (north) > Qi (east) > Central.
 */
function partitionByQuadrant(sites: BuiltSite[]): GeographicPartition {
  const buckets: GeographicPartition = { qin: [], chu: [], yan: [], qi: [], central: [] }
  for (const site of sites) {
    const [x, y] = site.position
    if (x < WIDTH * 0.35) {
      buckets.qin.push(site.id)
    } else if (y > HEIGHT * 0.65) {
      buckets.chu.push(site.id)
    } else if (y < HEIGHT * 0.25) {
      buckets.yan.push(site.id)
    } else if (x > WIDTH * 0.65) {
      buckets.qi.push(site.id)
    } else {
      buckets.central.push(site.id)
    }
  }
  return buckets
}

/**
 * Distribute the central region among 周/韩/赵/魏:
 *   - 周 gets 1-2 sites closest to canvas center
 *   - 赵 takes the upper (north) sub-region
 *   - 韩 takes the lower-west sub-region
 *   - 魏 takes the lower-east sub-region
 */
function distributeCentral(sites: BuiltSite[], centralIds: string[], assignment: RealmAssignment): void {
  const center: P = [WIDTH / 2, HEIGHT / 2]
  const sortedCentral = [...centralIds].sort((a, b) => {
    const sa = sites.find(s => s.id === a)!
    const sb = sites.find(s => s.id === b)!
    return dist(sa.position as P, center) - dist(sb.position as P, center)
  })

  // 周 gets 1-2 sites at the center
  const zhouCount = Math.min(2, Math.max(1, Math.floor(sortedCentral.length / 8)))
  for (const id of sortedCentral.slice(0, zhouCount)) {
    assignment.set(id, 'realm_zhou')
  }

  // Remaining central sites → 韩/赵/魏 by sub-region
  for (const id of sortedCentral.slice(zhouCount)) {
    const site = sites.find(s => s.id === id)!
    const [x, y] = site.position
    if (y < HEIGHT * 0.45) {
      assignment.set(id, 'realm_zhao')
    } else if (x < WIDTH * 0.5) {
      assignment.set(id, 'realm_han')
    } else {
      assignment.set(id, 'realm_wei')
    }
  }
}

function assignRealms(sites: BuiltSite[]): RealmAssignment {
  const assignment: RealmAssignment = new Map()
  const buckets = partitionByQuadrant(sites)

  for (const id of buckets.qin) assignment.set(id, 'realm_qin')
  for (const id of buckets.chu) assignment.set(id, 'realm_chu')
  for (const id of buckets.yan) assignment.set(id, 'realm_yan')
  for (const id of buckets.qi) assignment.set(id, 'realm_qi')

  distributeCentral(sites, buckets.central, assignment)

  return assignment
}

function realmCounts(assignment: RealmAssignment): Map<string, string[]> {
  const counts = new Map<string, string[]>()
  for (const realm of REALMS) counts.set(realm.id, [])
  for (const [siteId, realmId] of assignment) {
    const list = counts.get(realmId)
    if (list) list.push(siteId)
  }
  return counts
}

/**
 * Rebalance realms so each major realm has at least minPerMajor sites
 * (and 周 has at least 1). If any realm is below threshold, transfer the
 * geographically nearest site from the largest realm.
 */
function rebalanceRealms(sites: BuiltSite[], assignment: RealmAssignment): void {
  const minPerMajor = 5
  const minZhou = 1

  for (let pass = 0; pass < 50; pass++) {
    const counts = realmCounts(assignment)
    let needsRebalance = false

    for (const realm of REALMS) {
      const list = counts.get(realm.id)!
      const target = realm.id === 'realm_zhou' ? minZhou : minPerMajor
      if (list.length < target) {
        needsRebalance = true
        // Find largest donor (not the recipient)
        const donor = [...counts.entries()]
          .filter(([rid]) => rid !== realm.id)
          .sort((a, b) => b[1].length - a[1].length)[0]
        if (!donor || donor[1].length <= 1) continue

        // Transfer the donor site geographically closest to recipient cluster's
        // centroid (or to canvas region defined by the realm)
        const recipientCentroid = computeRealmCentroid(realm.id, sites, assignment)
        const donorSites = donor[1]
        donorSites.sort((a, b) => {
          const sa = sites.find(s => s.id === a)!
          const sb = sites.find(s => s.id === b)!
          return dist(sa.position as P, recipientCentroid) - dist(sb.position as P, recipientCentroid)
        })
        const transferId = donorSites[0]
        if (transferId) {
          assignment.set(transferId, realm.id)
        }
      }
    }

    if (!needsRebalance) break
  }
}

function computeRealmCentroid(realmId: string, sites: BuiltSite[], assignment: RealmAssignment): P {
  // If realm has sites, use mean position. Otherwise use canvas region defaults.
  const owned = sites.filter(s => assignment.get(s.id) === realmId)
  if (owned.length > 0) {
    const [cx, cy] = owned.reduce<[number, number]>(
      (acc, s) => [acc[0] + s.position[0], acc[1] + s.position[1]],
      [0, 0],
    )
    return [cx / owned.length, cy / owned.length]
  }

  // Geographic defaults if realm currently empty
  switch (realmId) {
    case 'realm_qin':
      return [WIDTH * 0.15, HEIGHT * 0.5]
    case 'realm_chu':
      return [WIDTH * 0.5, HEIGHT * 0.85]
    case 'realm_qi':
      return [WIDTH * 0.85, HEIGHT * 0.5]
    case 'realm_yan':
      return [WIDTH * 0.5, HEIGHT * 0.15]
    case 'realm_zhou':
      return [WIDTH * 0.5, HEIGHT * 0.5]
    case 'realm_han':
      return [WIDTH * 0.42, HEIGHT * 0.55]
    case 'realm_zhao':
      return [WIDTH * 0.5, HEIGHT * 0.35]
    case 'realm_wei':
      return [WIDTH * 0.58, HEIGHT * 0.55]
    default:
      return [WIDTH / 2, HEIGHT / 2]
  }
}

// ─── Realm Output Construction ───────────────────────────────────────────────
type RealmOutput = {
  id: string
  displayName: string
  fullTitle: string
  color: string
  capital: string
  initialSites: string[]
  initialArmies: Array<{ id: string; manpower: number; location: string }>
  aiPersonality: 'aggressive_random'
}

function buildRealmOutputs(sites: BuiltSite[], assignment: RealmAssignment): RealmOutput[] {
  const counts = realmCounts(assignment)
  const realms: RealmOutput[] = []

  for (const def of REALMS) {
    const ownedIds = counts.get(def.id) ?? []
    if (ownedIds.length === 0) {
      throw new Error(`Realm ${def.id} has 0 sites after rebalance`)
    }

    // Capital = first owned site (deterministic by site id order)
    const sortedOwned = [...ownedIds].sort()
    const capital = sortedOwned[0]!
    const secondSite = sortedOwned[1] ?? capital // fallback if only 1 site

    // Short id suffix: drop "realm_" prefix
    const suffix = def.id.replace(/^realm_/, '')

    const initialArmies = [
      { id: `army_${suffix}_1`, manpower: 5000, location: capital },
      { id: `army_${suffix}_2`, manpower: 5000, location: secondSite },
    ]

    realms.push({
      id: def.id,
      displayName: def.displayName,
      fullTitle: def.fullTitle,
      color: def.color,
      capital,
      initialSites: sortedOwned,
      initialArmies,
      aiPersonality: def.aiPersonality,
    })
  }

  return realms
}

function buildInitialOwnership(assignment: RealmAssignment): Record<string, string> {
  const out: Record<string, string> = {}
  // Sort by site id for deterministic output
  const entries = [...assignment.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  for (const [siteId, realmId] of entries) {
    out[siteId] = realmId
  }
  return out
}

// ─── Validation ──────────────────────────────────────────────────────────────
function validateEdgeCardinality(edgeTable: Map<string, EdgeEntry>, keyToId: Map<string, string>): void {
  for (const [key, entry] of edgeTable) {
    if (entry.cells.length > 2) {
      throw new Error(`Edge ${keyToId.get(key)} referenced by ${entry.cells.length} cells`)
    }
  }
}

function validateReverseFlags(sites: BuiltSite[]): void {
  const edgeRefs = new Map<string, Array<{ site: number; reverse: boolean }>>()
  for (let si = 0; si < sites.length; si++) {
    for (const ref of sites[si]!.boundary) {
      const list = edgeRefs.get(ref.edge) ?? []
      list.push({ site: si, reverse: ref.reverse })
      edgeRefs.set(ref.edge, list)
    }
  }

  for (const [eid, refs] of edgeRefs) {
    if (refs.length === 2 && refs[0]!.reverse === refs[1]!.reverse) {
      throw new Error(`Edge ${eid}: both sites have same reverse flag (should be opposite)`)
    }
  }
}

function validateRealmCoverage(sites: BuiltSite[], assignment: RealmAssignment): void {
  // Every site must have a realm
  for (const site of sites) {
    if (!assignment.has(site.id)) {
      throw new Error(`Site ${site.id} has no realm assignment`)
    }
  }
  // Every realm must have at least 1 site
  const counts = realmCounts(assignment)
  for (const def of REALMS) {
    const owned = counts.get(def.id) ?? []
    if (owned.length === 0) {
      throw new Error(`Realm ${def.id} has 0 sites`)
    }
  }
}

// ─── Output ──────────────────────────────────────────────────────────────────
function writeOutput(
  edges: Record<string, object>,
  sites: BuiltSite[],
  realms: RealmOutput[],
  initialOwnership: Record<string, string>,
  edgeTable: Map<string, EdgeEntry>,
): void {
  const output = {
    edges,
    sites,
    realms,
    initialOwnership,
    initialArmies: [] as unknown[],
    initialWars: [] as unknown[],
  }
  const outPath = path.join(process.cwd(), 'src', 'content', 'm1', 'scenario.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')

  const sharedCount = [...edgeTable.values()].filter(e => e.cells.length === 2).length
  const boundaryCount = edgeTable.size - sharedCount
  console.log(`✅ Generated ${outPath}`)
  console.log(`   Sites: ${sites.length}`)
  console.log(`   Realms: ${realms.length}`)
  console.log(`   Total edges: ${edgeTable.size} (${sharedCount} shared, ${boundaryCount} boundary)`)
  console.log('   Realm distribution:')
  for (const realm of realms) {
    console.log(`     ${realm.displayName} (${realm.id}): ${realm.initialSites.length} sites, capital=${realm.capital}`)
  }
  console.log('   Invariants: ✓')
}

// ─── Main ────────────────────────────────────────────────────────────────────
function generate(): void {
  // Try seeds until BFS connectivity passes (rarely needs retry with Lloyd relaxation)
  let seed = SEED
  let pts: P[] = []
  let cellPolys: P[][] = []
  let sites: BuiltSite[] = []
  let edgeTable = new Map<string, EdgeEntry>()
  let edges: Record<string, object> = {}
  let keyToId = new Map<string, string>()

  for (let attempt = 0; attempt < 32; attempt++) {
    pts = createRelaxedPoints(seed)
    cellPolys = getCellPolygons(pts)
    edgeTable = buildEdgeTable(cellPolys)
    const built = buildEdges(edgeTable)
    edges = built.edges
    keyToId = built.keyToId
    sites = buildSites(cellPolys, keyToId)

    if (isFullyConnected(sites)) {
      if (attempt > 0) console.log(`   (Retried with seed ${seed.toString(16)} after ${attempt} attempt(s))`)
      break
    }

    seed = (seed + 1) >>> 0
    if (attempt === 31) {
      throw new Error('Could not generate connected map after 32 seed retries')
    }
  }

  if (sites.length !== N_SITES) {
    throw new Error(`Expected ${N_SITES} sites, got ${sites.length}`)
  }

  const assignment = assignRealms(sites)
  rebalanceRealms(sites, assignment)
  validateRealmCoverage(sites, assignment)

  const realms = buildRealmOutputs(sites, assignment)
  if (realms.length !== N_REALMS) {
    throw new Error(`Expected ${N_REALMS} realms, got ${realms.length}`)
  }

  const initialOwnership = buildInitialOwnership(assignment)

  validateEdgeCardinality(edgeTable, keyToId)
  validateReverseFlags(sites)

  writeOutput(edges, sites, realms, initialOwnership, edgeTable)
}

generate()
