import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { PersonalityArchetype } from '~/shared/types'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(testDir, '../../../../')

const ARCHETYPES: readonly PersonalityArchetype[] = [
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
]

function collectTestFiles(dir: string): string[] {
  const out: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectTestFiles(full))
    } else if (
      entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')
    ) {
      out.push(full)
    }
  }
  return out
}

function findArchetypesInFiles(files: readonly string[]): Set<PersonalityArchetype> {
  const found = new Set<PersonalityArchetype>()
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    for (const archetype of ARCHETYPES) {
      if (content.includes(`'${archetype}'`) || content.includes(`"${archetype}"`)) {
        found.add(archetype)
      }
    }
  }
  return found
}

describe('M8 archetype fixture coverage', () => {
  const testFiles = collectTestFiles(srcDir)
  const foundArchetypes = findArchetypesInFiles(testFiles)

  it('at least 5 different archetypes appear in test fixtures', () => {
    expect(
      foundArchetypes.size,
      `Found archetypes: ${[...foundArchetypes].sort().join(', ')}`
    ).toBeGreaterThanOrEqual(5)
  })

  it('personality-coverage.test.ts covers all 8 archetypes', () => {
    const file = path.resolve(testDir, 'personality-coverage.test.ts')
    const content = fs.readFileSync(file, 'utf-8')
    for (const archetype of ARCHETYPES) {
      expect(content, `personality-coverage.test.ts missing archetype: ${archetype}`)
        .toContain(`'${archetype}'`)
    }
  })

  it('m8-behavior-harness.test.ts references DEFAULT_ARCHETYPE_MAPPING (covers all 8)', () => {
    const file = path.resolve(testDir, 'm8-behavior-harness.test.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('DEFAULT_ARCHETYPE_MAPPING')
  })

  it('m8-behavior-harness.ts (DEFAULT_ARCHETYPE_MAPPING) maps all 8 archetypes', () => {
    const file = path.resolve(testDir, 'm8-behavior-harness.ts')
    const content = fs.readFileSync(file, 'utf-8')
    for (const archetype of ARCHETYPES) {
      expect(content, `DEFAULT_ARCHETYPE_MAPPING missing archetype: ${archetype}`)
        .toContain(`'${archetype}'`)
    }
  })
})
