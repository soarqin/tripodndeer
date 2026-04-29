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
})
