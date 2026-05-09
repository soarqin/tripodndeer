import * as fs from 'fs'
import * as path from 'path'
import { Delaunay } from 'd3-delaunay'

// ─── Constants ────────────────────────────────────────────────────────────────
const WIDTH = 800
const HEIGHT = 600
const N_SITES = 5
const LLOYD_ITER = 4
const N_SUBDIV = 4
const NOISE_RATIO = 0.08

const SITE_IDS = ['site_1', 'site_2', 'site_3', 'site_4', 'site_5'] as const
const SITE_NAMES = ['邑甲', '邑乙', '邑丙', '邑丁', '邑戊'] as const
const REALMS = [
  { id: 'realm_red', displayName: '红', fullTitle: '红方', color: '#dc2626', capital: 'site_1', initialSites: ['site_1'], initialArmies: [] },
  { id: 'realm_blue', displayName: '蓝', fullTitle: '蓝方', color: '#2563eb', capital: 'site_2', initialSites: ['site_2', 'site_3', 'site_4', 'site_5'], initialArmies: [] },
]
const INITIAL_OWNERSHIP: Record<string, string> = {
  site_1: 'realm_red',
  site_2: 'realm_blue',
  site_3: 'realm_blue',
  site_4: 'realm_blue',
  site_5: 'realm_blue',
}

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

const globalRng = mulberry32(12345)
const randRange = (lo: number, hi: number) => lo + globalRng() * (hi - lo)

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

// ─── Main generation ──────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function r2p(p: P): [number, number] {
  return [round2(p[0]), round2(p[1])]
}

function r2pair(c: [P, P]): [[number, number], [number, number]] {
  return [r2p(c[0]), r2p(c[1])]
}

function createRelaxedPoints(): P[] {
  let pts: P[] = Array.from(
    { length: N_SITES },
    () => [randRange(120, WIDTH - 120), randRange(100, HEIGHT - 100)] as P,
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

function buildEdges(edgeTable: Map<string, EdgeEntry>): { edges: Record<string, object>; keyToId: Map<string, string> } {
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
    const travel_cost = Math.max(1, Math.round(d / 100))

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

function buildSites(cellPolys: P[][], keyToId: Map<string, string>) {
  return cellPolys.map((poly, ci) => {
    return {
      id: SITE_IDS[ci]!,
      name: SITE_NAMES[ci]!,
      position: r2p(centroid(poly)),
      boundary: buildBoundary(poly, keyToId),
    }
  })
}

function validateEdgeCardinality(edgeTable: Map<string, EdgeEntry>, keyToId: Map<string, string>): void {
  for (const [key, entry] of edgeTable) {
    if (entry.cells.length > 2) {
      throw new Error(`Edge ${keyToId.get(key)} referenced by ${entry.cells.length} cells`)
    }
  }
}

function validateReverseFlags(sites: ReturnType<typeof buildSites>): void {
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

function writeOutput(edges: Record<string, object>, sites: ReturnType<typeof buildSites>, edgeTable: Map<string, EdgeEntry>): void {
  const output = { edges, sites, realms: REALMS, initialOwnership: INITIAL_OWNERSHIP }
  const outPath = path.join(process.cwd(), 'src', 'content', 'm0', 'sites.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')

  const sharedCount = [...edgeTable.values()].filter(e => e.cells.length === 2).length
  const boundaryCount = edgeTable.size - sharedCount
  console.log(`✅ Generated ${outPath}`)
  console.log(`   Sites: ${sites.length}`)
  console.log(`   Total edges: ${edgeTable.size} (${sharedCount} shared, ${boundaryCount} boundary)`)
  console.log('   Invariants: ✓')
}

function generate(): void {
  const cellPolys = getCellPolygons(createRelaxedPoints())
  const edgeTable = buildEdgeTable(cellPolys)
  const { edges, keyToId } = buildEdges(edgeTable)
  const sites = buildSites(cellPolys, keyToId)

  validateEdgeCardinality(edgeTable, keyToId)
  validateReverseFlags(sites)
  writeOutput(edges, sites, edgeTable)
}

generate()
