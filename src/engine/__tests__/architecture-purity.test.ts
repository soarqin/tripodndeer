import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
// testDir = src/engine/__tests__；engine 根 = ../，向上一层即 src/engine/
const engineDir = path.resolve(testDir, '../')

function getAllTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (entry.name === '__tests__') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllTsFiles(full))
    } else if (entry.name.endsWith('.ts')) {
      files.push(full)
    }
  }
  return files
}

const BANNED_IMPORTS = ['react', 'react-dom', 'zustand', 'jsdom']
const BANNED_GLOBALS = ['window.', 'document.', 'navigator.', 'requestAnimationFrame', 'cancelAnimationFrame']

describe('engine architecture purity', () => {
  const files = getAllTsFiles(engineDir)

  it('has engine files to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('no banned imports in engine files', () => {
    const violations: string[] = []
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const importLines = content.match(/^import\s+.+\s+from\s+['"].+['"]/gm) ?? []
      for (const line of importLines) {
        for (const banned of BANNED_IMPORTS) {
          if (line.includes(`'${banned}'`) || line.includes(`"${banned}"`)) {
            violations.push(`${path.relative(engineDir, file)}: ${line.trim()}`)
          }
        }
      }
    }
    expect(violations, `Found banned imports:\n${violations.join('\n')}`).toHaveLength(0)
  })

  it('no banned browser globals in engine files', () => {
    const violations: string[] = []
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const glob of BANNED_GLOBALS) {
        if (content.includes(glob)) {
          violations.push(`${path.relative(engineDir, file)}: uses ${glob}`)
        }
      }
    }
    expect(violations, `Found banned globals:\n${violations.join('\n')}`).toHaveLength(0)
  })
})
