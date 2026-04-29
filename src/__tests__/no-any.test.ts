import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(testDir, '../')
const BANNED_PATTERNS = [/\bas any\b/, /@ts-ignore/, /@ts-expect-error/]

function getAllSrcFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (entry.name === '__tests__') continue
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllSrcFiles(full))
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(full)
    }
  }
  return files
}

describe('no-any policy', () => {
  const files = getAllSrcFiles(srcDir)

  it('no "as any" in source files', () => {
    const violations: string[] = []
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${path.relative(srcDir, file)}: matches ${pattern}`)
        }
      }
    }
    expect(violations, `Found banned patterns:\n${violations.join('\n')}`).toHaveLength(0)
  })
})
