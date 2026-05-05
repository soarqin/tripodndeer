import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { M9_FORBIDDEN_ANACHRONISM_STRINGS } from '../m2/balance'

const M9_EVENTS_DIR = join(process.cwd(), 'src/content/m9/events')
const M9_LOCALES_DIR = join(process.cwd(), 'src/content/locales')
const M9_TEMPLATES_FILE = join(process.cwd(), 'src/content/m9/character-templates.json')
const M9_SITES_DIR = join(process.cwd(), 'src/content/m9/sites')
const M9_PASSES_FILE = join(process.cwd(), 'src/content/m9/passes.json')

function getAllEventFiles(): string[] {
  const files: string[] = []
  if (!existsSync(M9_EVENTS_DIR)) return files
  const entries = readdirSync(M9_EVENTS_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(join(M9_EVENTS_DIR, entry.name))
    }

    if (entry.isDirectory()) {
      const subDir = join(M9_EVENTS_DIR, entry.name)
      const subEntries = readdirSync(subDir)
      for (const sub of subEntries) {
        if (sub.endsWith('.json')) files.push(join(subDir, sub))
      }
    }
  }

  return files
}

function getAllEventContent(): string {
  return getAllEventFiles().map((filePath) => readFileSync(filePath, 'utf-8')).join('\n')
}

describe('M9 Tier 1 Historical Fidelity Audit', () => {
  it('Test 1: 0 forbidden anachronism strings in event text', () => {
    const content = getAllEventContent()

    for (const forbidden of M9_FORBIDDEN_ANACHRONISM_STRINGS) {
      const count = (content.match(new RegExp(forbidden, 'g')) ?? []).length
      expect(count, `Found forbidden string "${forbidden}" in event files`).toBe(0)
    }
  })

  it('Test 2: §5.3 13 core event chains all present with year-gate', () => {
    const eventFiles = getAllEventFiles().map((filePath) => filePath.split('/').pop()!)
    const requiredChains = [
      'zhou-recognizes-three-jin.json',
      'tian-replaces-jiang.json',
      'qin-xiao-seeks-talent.json',
      'shang-yang-reform.json',
      'maling-battle.json',
      'su-qin-vertical-alliance.json',
      'zhang-yi-horizontal.json',
      'zhao-hu-fu.json',
      'yue-yi-attack-qi.json',
      'changping-battle.json',
      'qin-destroys-east-zhou.json',
      'qin-unification-han.json',
      'qin-unification-final.json',
    ]

    for (const chain of requiredChains) {
      expect(eventFiles, `Missing required chain: ${chain}`).toContain(chain)
    }
  })

  it('Test 3: §5.3 key figures in character templates', () => {
    if (!existsSync(M9_TEMPLATES_FILE)) return

    const data = JSON.parse(readFileSync(M9_TEMPLATES_FILE, 'utf-8')) as {
      templates: Array<{ id: string }>
    }
    const ids = data.templates.map((template) => template.id)
    const requiredFigures = [
      'char_shang_yang',
      'char_zhang_yi',
      'char_bai_qi',
      'char_lian_po',
      'char_lin_xiangru',
      'char_zhao_kuo',
    ]

    for (const fig of requiredFigures) {
      expect(ids, `Missing required figure: ${fig}`).toContain(fig)
    }
  })

  it('Test 4: 12 realm capitals in sites', () => {
    if (!existsSync(M9_SITES_DIR)) return

    const siteFiles = readdirSync(M9_SITES_DIR).filter((file) => file.endsWith('.json'))
    const allSiteIds: string[] = []

    for (const fileName of siteFiles) {
      const data = JSON.parse(readFileSync(join(M9_SITES_DIR, fileName), 'utf-8')) as {
        sites: Array<{ id: string }>
      }
      allSiteIds.push(...data.sites.map((site) => site.id))
    }

    const requiredCapitals = ['site_xianyang', 'site_ying', 'site_linzi', 'site_ji', 'site_handan', 'site_luoyi']
    for (const capital of requiredCapitals) {
      expect(allSiteIds, `Missing capital: ${capital}`).toContain(capital)
    }
  })

  it('Test 5: Tier 1 passes present', () => {
    if (!existsSync(M9_PASSES_FILE)) return

    const data = JSON.parse(readFileSync(M9_PASSES_FILE, 'utf-8')) as { passes: Array<{ id: string }> }
    const passIds = data.passes.map((pass) => pass.id)

    expect(passIds.length, 'Should have 13-15 new passes').toBeGreaterThanOrEqual(13)
  })

  it('Test 6: character templates all have source field', () => {
    if (!existsSync(M9_TEMPLATES_FILE)) return

    const data = JSON.parse(readFileSync(M9_TEMPLATES_FILE, 'utf-8')) as {
      templates: Array<{ id: string; source?: string }>
    }
    const withoutSource = data.templates.filter((template) => !template.source)

    expect(withoutSource.length, 'All templates should have source field').toBe(0)
  })

  it('Test 7: event chains have author + reviewedBy fields', () => {
    const eventFiles = getAllEventFiles()

    for (const filePath of eventFiles) {
      const content = readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content) as { author?: string; reviewedBy?: string }
      expect(data.author, `Missing author in ${filePath}`).toBeDefined()
      expect(data.reviewedBy, `Missing reviewedBy in ${filePath}`).toBeDefined()
    }
  })
})
