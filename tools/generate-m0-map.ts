import * as fs from 'fs'
import * as path from 'path'

// 一次性地图数据生成脚本
// 使用方案 B：手工预设不规则多边形，避免 d3-delaunay 依赖
// 运行：pnpm generate:m0-map

interface MapSite {
  id: string
  name: string
  position: [number, number]
  polygon: [number, number][]
  adjacency: string[]
}

interface MapFaction {
  id: string
  displayName: string
  color: string
}

const sites: MapSite[] = [
  {
    id: 'site_1',
    name: '邑甲',
    position: [190, 160],
    polygon: [
      [20, 20], [280, 10], [330, 80], [310, 200],
      [250, 250], [180, 280], [80, 260], [15, 180],
    ],
    adjacency: ['site_2', 'site_3'],
  },
  {
    id: 'site_2',
    name: '邑乙',
    position: [580, 150],
    polygon: [
      [340, 5], [780, 15], [790, 280], [710, 310],
      [600, 260], [480, 230], [340, 200], [330, 85],
    ],
    adjacency: ['site_1', 'site_4'],
  },
  {
    id: 'site_3',
    name: '邑丙',
    position: [200, 400],
    polygon: [
      [10, 270], [170, 285], [255, 260], [310, 310],
      [290, 470], [220, 530], [80, 560], [5, 480],
    ],
    adjacency: ['site_1', 'site_4', 'site_5'],
  },
  {
    id: 'site_4',
    name: '邑丁',
    position: [580, 400],
    polygon: [
      [480, 240], [600, 265], [710, 315], [790, 290],
      [785, 540], [680, 575], [520, 540], [380, 480],
      [300, 315], [310, 315],
    ],
    adjacency: ['site_2', 'site_3', 'site_5'],
  },
  {
    id: 'site_5',
    name: '邑戊',
    position: [380, 560],
    polygon: [
      [80, 570], [220, 535], [290, 475], [380, 490],
      [520, 545], [680, 580], [600, 595], [300, 598],
      [100, 595],
    ],
    adjacency: ['site_3', 'site_4'],
  },
]

const factions: MapFaction[] = [
  { id: 'faction_red', displayName: '红', color: '#dc2626' },
  { id: 'faction_blue', displayName: '蓝', color: '#2563eb' },
]

const initialOwnership: Record<string, string> = {
  site_1: 'faction_red',
  site_2: 'faction_blue',
  site_3: 'faction_blue',
  site_4: 'faction_blue',
  site_5: 'faction_blue',
}

// 验证邻接关系闭合
for (const site of sites) {
  for (const neighborId of site.adjacency) {
    const neighbor = sites.find(s => s.id === neighborId)
    if (!neighbor) {
      throw new Error(`Site ${site.id} references unknown neighbor ${neighborId}`)
    }
    if (!neighbor.adjacency.includes(site.id)) {
      throw new Error(`Adjacency not closed: ${site.id} → ${neighborId} but not ←`)
    }
  }
}

// 验证多边形顶点数
for (const site of sites) {
  if (site.polygon.length < 6) {
    throw new Error(`Site ${site.id} has only ${site.polygon.length} vertices (min 6)`)
  }
}

// 验证所有 site 都在 initialOwnership 中
for (const site of sites) {
  if (!(site.id in initialOwnership)) {
    throw new Error(`Site ${site.id} missing from initialOwnership`)
  }
}

const output = { sites, factions, initialOwnership }

const outPath = path.join(process.cwd(), 'src', 'content', 'm0', 'sites.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
console.log(`✅ Generated ${outPath}`)
console.log(`   Sites: ${sites.length}`)
console.log(`   Min polygon vertices: ${Math.min(...sites.map(s => s.polygon.length))}`)
console.log(`   Sites with ≥3 neighbors: ${sites.filter(s => s.adjacency.length >= 3).map(s => s.id).join(', ')}`)
console.log(`   Adjacency closure: OK`)
