import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { M9_FORBIDDEN_ANACHRONISM_STRINGS } from '../../m2/balance'

const LOCALE_FILE = join(process.cwd(), 'src/content/locales/zh-CN.json')

function getLocaleKeys(): string[] {
  if (!existsSync(LOCALE_FILE)) return []
  const data = JSON.parse(readFileSync(LOCALE_FILE, 'utf-8')) as Record<string, string>
  return Object.keys(data)
}

function getLocaleValues(): string[] {
  if (!existsSync(LOCALE_FILE)) return []
  const data = JSON.parse(readFileSync(LOCALE_FILE, 'utf-8')) as Record<string, string>
  return Object.values(data)
}

describe('i18n key coverage', () => {
  it('Test 1: all keys follow dot-namespace format', () => {
    const keys = getLocaleKeys()
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(key, `Key "${key}" does not follow dot-namespace format`).toMatch(
        /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/
      )
    }
  })

  it('Test 2: no forbidden anachronism strings in values', () => {
    const values = getLocaleValues()
    const allText = values.join('\n')
    for (const forbidden of M9_FORBIDDEN_ANACHRONISM_STRINGS) {
      const count = (allText.match(new RegExp(forbidden, 'g')) ?? []).length
      expect(count, `Found forbidden string "${forbidden}" in zh-CN.json`).toBe(0)
    }
  })

  it('Test 3: key count is within expected range', () => {
    const keys = getLocaleKeys()
    expect(keys.length).toBeGreaterThanOrEqual(100)
  })

  it('Test 4: all keys are unique (no duplicates)', () => {
    const keys = getLocaleKeys()
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })
})
