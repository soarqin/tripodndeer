import * as fs from 'fs'
import * as path from 'path'
import { Delaunay } from 'd3-delaunay'

const WIDTH = 800
const HEIGHT = 600
const N_SITES = 5
const LLOYD_ITER = 4
const SUBDIVISIONS = 20
const NOISE_RATIO = 0.08

const SITE_IDS = ['site_1', 'site_2', 'site_3', 'site_4', 'site_5'] as const
const SITE_NAMES = ['邑甲', '邑乙', '邑丙', '邑丁', '邑戊'] as const
const FACTIONS = [
  { id: 'faction_red', displayName: '红', color: '#dc2626' },
  { id: 'faction_blue', displayName: '蓝', color: '#2563eb' },
]
const INITIAL_OWNERSHIP: Record<string, string> = {
  site_1: 'faction_red',
  site_2: 'faction_blue',
  site_3: 'faction_blue',
  site_4: 'faction_blue',
  site_5: 'faction_blue',
}

type P = [number, number]

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(12345)
const randRange = (min: number, max: number) => min + rng() * (max - min)

function centroid(pts: P[]): P {
  let cx = 0
  let cy = 0
  for (const [x, y] of pts) {
    cx += x
    cy += y
  }
  return [cx / pts.length, cy / pts.length]
}

function edgeLength(a: P, b: P): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)
}

function perpUnit(a: P, b: P): P {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return [-dy / len, dx / len]
}

function edgeHash(a: P, b: P): number {
  const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a]
  return (
    (Math.round(p[0] * 1000) * 73856093) ^
    (Math.round(p[1] * 1000) * 19349663) ^
    (Math.round(q[0] * 1000) * 83492791) ^
    (Math.round(q[1] * 1000) * 59349677)
  )
}

function perturbEdge(a: P, b: P): P[] {
  const hash = edgeHash(a, b)
  const edgeRng = mulberry32(Math.abs(hash) || 1)
  const len = edgeLength(a, b)
  const perp = perpUnit(a, b)
  const result: P[] = [a]

  for (let j = 1; j < SUBDIVISIONS; j++) {
    const t = j / SUBDIVISIONS
    const amplitude = Math.sin(t * Math.PI) * len * NOISE_RATIO
    const noise = (edgeRng() - 0.5) * 2 * amplitude
    result.push([
      a[0] + (b[0] - a[0]) * t + perp[0] * noise,
      a[1] + (b[1] - a[1]) * t + perp[1] * noise,
    ])
  }

  return result
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

function getRawPolygons(pts: P[], delaunay: Delaunay<P>): P[][] {
  const voronoi = delaunay.voronoi([0, 0, WIDTH, HEIGHT])
  return pts.map((_, i) => {
    const poly = voronoi.cellPolygon(i)
    if (!poly) throw new Error(`Cell ${i} has no polygon`)
    return (poly as P[]).slice(0, -1)
  })
}

function perturbPolygon(poly: P[]): P[] {
  const result: P[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    result.push(...perturbEdge(a, b))
  }
  return result
}

function buildAdjacency(delaunay: Delaunay<P>): Set<number>[] {
  const adjSets: Set<number>[] = Array.from({ length: N_SITES }, () => new Set())
  for (let i = 0; i < N_SITES; i++) {
    for (const j of delaunay.neighbors(i)) {
      adjSets[i]!.add(j)
      adjSets[j]!.add(i)
    }
  }
  return adjSets
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function validateSites(sites: ReturnType<typeof buildSites>): void {
  const minVerts = Math.min(...sites.map(s => s.polygon.length))
  if (minVerts < 80) throw new Error(`Min polygon vertices = ${minVerts} (need ≥80)`)

  for (const site of sites) {
    for (const nId of site.adjacency) {
      const nb = sites.find(s => s.id === nId)!
      if (!nb.adjacency.includes(site.id)) {
        throw new Error(`Adjacency not closed: ${site.id} ↔ ${nId}`)
      }
    }
  }
}

function buildSites(pts: P[], perturbedPolygons: P[][], adjSets: Set<number>[]) {
  return pts.map((_, i) => {
    const ctr = centroid(perturbedPolygons[i]!)
    return {
      id: SITE_IDS[i]!,
      name: SITE_NAMES[i]!,
      position: [round2(ctr[0]), round2(ctr[1])] as [number, number],
      polygon: perturbedPolygons[i]!.map(([x, y]) => [round2(x), round2(y)] as [number, number]),
      adjacency: [...adjSets[i]!].map(j => SITE_IDS[j]!).sort(),
    }
  })
}

function generate(): void {
  const pts = createRelaxedPoints()
  const delaunay = Delaunay.from(pts)
  const rawPolygons = getRawPolygons(pts, delaunay)
  const perturbedPolygons = rawPolygons.map(perturbPolygon)
  const adjSets = buildAdjacency(delaunay)
  const sites = buildSites(pts, perturbedPolygons, adjSets)

  validateSites(sites)

  const output = { sites, factions: FACTIONS, initialOwnership: INITIAL_OWNERSHIP }
  const outPath = path.join(process.cwd(), 'src', 'content', 'm0', 'sites.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')

  console.log(`✅ Generated ${outPath}`)
  console.log(`   Sites: ${sites.length}`)
  console.log(`   Min polygon vertices: ${Math.min(...sites.map(s => s.polygon.length))}`)
  console.log(`   Sites with ≥3 neighbors: ${sites.filter(s => s.adjacency.length >= 3).map(s => s.id).join(', ')}`)
}

generate()
