import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
// testDir = src/engine/__tests__；engine 根 = ../，向上一层即 src/engine/
const engineDir = path.resolve(testDir, '../')
const srcDir = path.resolve(engineDir, '../')
const uiDir = path.resolve(srcDir, 'ui')
const renderingDir = path.resolve(srcDir, 'rendering')

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

const BANNED_IMPORTS = ['react', 'react-dom', 'zustand', 'jsdom', 'idb']
const BANNED_LAYER_ALIASES = ['~/ui/store/persistence', '@/ui/store/persistence']
const BANNED_GLOBALS = ['window.', 'document.', 'navigator.', 'requestAnimationFrame', 'cancelAnimationFrame']
const IMPORT_PATTERN = /^\s*import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gm

function extractImportSpecifiers(content: string): string[] {
  return [...content.matchAll(IMPORT_PATTERN)].map(match => match[1]!)
}

function isBannedPackageImport(specifier: string): boolean {
  return BANNED_IMPORTS.some(banned => specifier === banned || specifier.startsWith(`${banned}/`))
}

function isBannedPersistenceAlias(specifier: string): boolean {
  return BANNED_LAYER_ALIASES.some(banned => specifier === banned || specifier.startsWith(`${banned}/`))
}

function resolvesInsideDir(target: string, dir: string): boolean {
  const relative = path.relative(dir, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function resolveSourceImport(importerFile: string, specifier: string): string | null {
  if (specifier.startsWith('@/') || specifier.startsWith('~/')) {
    return path.resolve(srcDir, specifier.slice(2))
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return path.resolve(path.dirname(importerFile), specifier)
  }
  return null
}

function isBannedLayerImport(importerFile: string, specifier: string): boolean {
  const resolved = resolveSourceImport(importerFile, specifier)
  return resolved !== null && (resolvesInsideDir(resolved, uiDir) || resolvesInsideDir(resolved, renderingDir))
}

describe('engine architecture purity', () => {
  const files = getAllTsFiles(engineDir)

  it('has engine files to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('no banned imports in engine files', () => {
    const violations: string[] = []
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const specifier of extractImportSpecifiers(content)) {
        if (
          isBannedPackageImport(specifier) ||
          isBannedLayerImport(file, specifier) ||
          isBannedPersistenceAlias(specifier)
        ) {
          violations.push(`${path.relative(engineDir, file)}: imports ${specifier}`)
        }
      }
    }
    expect(violations, `Found banned imports:\n${violations.join('\n')}`).toHaveLength(0)
  })

  it('parses multiline import declarations', () => {
    const specifiers = extractImportSpecifiers(`
      import {
        combatV2Step,
        resolveCombat,
      } from '~/engine/systems/combat-v2'
      import type {
        World,
        Site,
      } from '@/shared/types'
    `)

    expect(specifiers).toEqual(['~/engine/systems/combat-v2', '@/shared/types'])
  })

  it('rejects imports from UI and rendering aliases', () => {
    const file = path.join(engineDir, 'systems', 'ai', 'ai.ts')

    expect(isBannedLayerImport(file, '~/ui/store')).toBe(true)
    expect(isBannedLayerImport(file, '@/ui/store')).toBe(true)
    expect(isBannedLayerImport(file, '~/rendering/map')).toBe(true)
    expect(isBannedLayerImport(file, '@/rendering/map')).toBe(true)
  })

  it('rejects relative imports resolving into UI or rendering', () => {
    const file = path.join(engineDir, 'systems', 'ai', 'ai.ts')

    expect(isBannedLayerImport(file, '../../../ui/store')).toBe(true)
    expect(isBannedLayerImport(file, '../../../rendering/map')).toBe(true)
    expect(isBannedLayerImport(file, '../../random')).toBe(false)
    expect(isBannedLayerImport(file, '~/engine/random')).toBe(false)
  })

  it('rejects banned package imports including subpaths', () => {
    expect(isBannedPackageImport('react')).toBe(true)
    expect(isBannedPackageImport('react-dom/client')).toBe(true)
    expect(isBannedPackageImport('zustand/middleware')).toBe(true)
    expect(isBannedPackageImport('jsdom')).toBe(true)
    expect(isBannedPackageImport('idb')).toBe(true)
    expect(isBannedPackageImport('idb/with-async-ittr')).toBe(true)
    expect(isBannedPackageImport('~/shared/types')).toBe(false)
  })

  it('rejects persistence layer aliases (C1 — engine must not import idb/persistence)', () => {
    expect(isBannedPersistenceAlias('~/ui/store/persistence')).toBe(true)
    expect(isBannedPersistenceAlias('~/ui/store/persistence/auto-ring-buffer')).toBe(true)
    expect(isBannedPersistenceAlias('@/ui/store/persistence')).toBe(true)
    expect(isBannedPersistenceAlias('@/ui/store/persistence/db')).toBe(true)
    expect(isBannedPersistenceAlias('~/ui/store')).toBe(false)
    expect(isBannedPersistenceAlias('~/shared/types/save-dto')).toBe(false)
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
