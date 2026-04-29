import { describe, it, expect } from 'vitest'
import * as path from 'path'
import { readFileSync } from 'fs'
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
})
