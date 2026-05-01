import { describe, it, expect } from 'vitest'
import * as path from 'path'
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const pkgPath = path.resolve(testDir, '../../package.json')

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const BANNED_RUNTIME = [
  'date-fns', 'dayjs', 'moment', 'lodash', 'immutable',
  'rxjs', 'react-i18next', 'i18next',
]

const M4_BALANCE_DIRS = [
  path.resolve(testDir, '../engine/systems/economy'),
  path.resolve(testDir, '../engine/systems/statecraft'),
]

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

function getM4InlineTuningMatches(dir: string): string[] {
  if (!path.isAbsolute(dir)) return []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    const files = entries.flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return getM4InlineTuningMatches(full)
      if (!/\.ts$/.test(entry.name)) return []
      return [full]
    })

    const matches: string[] = []
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split(/\r?\n/)
      lines.forEach((line, index) => {
        const match = line.match(/^(?:export\s+)?const\s+[A-Z0-9_]+\s*=\s*(-?\d+(?:\.\d+)?)\s*;?\s*$/)
        if (!match) return
        const value = Number(match[1])
        if (value === 0 || value === 1) return
        matches.push(`${file}:${index + 1}: ${line.trim()}`)
      })
    }
    return matches
  } catch {
    return []
  }
}

describe('banned-deps', () => {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson
  const deps = pkg.dependencies ?? {}
  const devDeps = pkg.devDependencies ?? {}

  it('no banned packages in dependencies or devDependencies', () => {
    const all = { ...deps, ...devDeps }
    const found = BANNED_RUNTIME.filter(b => all[b] !== undefined)
    expect(found, `Found banned packages: ${found.join(', ')}`).toHaveLength(0)
  })

  it('d3-delaunay is not in runtime dependencies', () => {
    expect(deps['d3-delaunay']).toBeUndefined()
  })

  it("should not contain string literal 'faction_'", () => {
    const srcDir = path.resolve(testDir, '..')
    const matches = listSourceFiles(srcDir)
      .filter((file) => !file.endsWith(path.sep + 'banned-deps.test.ts'))
      .filter((file) => readFileSync(file, 'utf-8').includes("'faction_"))
    expect(matches).toHaveLength(0)
  })

  it('M4 economy/statecraft files should not declare inline numeric tuning constants', () => {
    const matches = M4_BALANCE_DIRS.flatMap((dir) => getM4InlineTuningMatches(dir))
    expect(matches, `Found inline M4 tuning constants:\n${matches.join('\n')}`).toHaveLength(0)
  })
})
