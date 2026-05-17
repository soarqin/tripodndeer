import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..')
const SRC_DIR = path.join(ROOT, 'src')

const ALLOWLIST = new Set(
  [
    'src/ui/store/persistence/db.ts',
    'src/ui/store/persistence/slot-crud.ts',
    'src/ui/store/persistence/auto-ring-buffer.ts',
    'src/ui/store/persistence/quarantine.ts',
    'src/ui/store/persistence/compression.ts',
  ].map(p => path.join(ROOT, p)),
)

const FORBIDDEN_PATTERNS: readonly { name: string; regex: RegExp }[] = [
  { name: "openDB(", regex: /\bopenDB\s*\(/ },
  { name: "db.transaction('saves'", regex: /\.transaction\s*\(\s*['"]saves['"]/ },
  { name: "db.put('saves'", regex: /\.put\s*\(\s*['"]saves['"]/ },
  { name: "db.get('saves'", regex: /\.get\s*\(\s*['"]saves['"]/ },
  { name: "db.getAll('saves'", regex: /\.getAll\s*\(\s*['"]saves['"]/ },
  { name: "db.delete('saves'", regex: /\.delete\s*\(\s*['"]saves['"]/ },
  { name: "db.clear('saves'", regex: /\.clear\s*\(\s*['"]saves['"]/ },
  { name: "getDb(", regex: /\bgetDb\s*\(/ },
]

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, acc)
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      acc.push(full)
    }
  }
  return acc
}

function isAllowed(file: string): boolean {
  if (ALLOWLIST.has(file)) return true
  return file.includes(`${path.sep}__tests__${path.sep}`)
}

interface Violation {
  file: string
  line: number
  pattern: string
  text: string
}

function scanFile(file: string): Violation[] {
  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split(/\r?\n/)
  const found: Violation[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    for (const { name, regex } of FORBIDDEN_PATTERNS) {
      if (regex.test(line)) {
        found.push({ file, line: i + 1, pattern: name, text: line.trim() })
      }
    }
  }
  return found
}

describe('save persistence single-entry invariant (M6)', () => {
  it('no file outside the allowlist makes direct IDB calls to the saves store', () => {
    const allFiles = walk(SRC_DIR)
    const violations: Violation[] = []
    for (const file of allFiles) {
      if (isAllowed(file)) continue
      violations.push(...scanFile(file))
    }

    const formatted = violations.map(v => {
      const rel = path.relative(ROOT, v.file)
      return `${rel}:${v.line} forbidden=${v.pattern}  >>  ${v.text}`
    })
    expect(formatted, formatted.join('\n')).toEqual([])
  })

  it('allowlist files exist and contain at least one direct IDB call (sanity check)', () => {
    let totalAllowedHits = 0
    for (const file of ALLOWLIST) {
      expect(fs.existsSync(file), `allowlist file missing: ${file}`).toBe(true)
      totalAllowedHits += scanFile(file).length
    }
    expect(totalAllowedHits).toBeGreaterThan(0)
  })
})
