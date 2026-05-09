import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const LOCALE_FILE = join(process.cwd(), 'src/content/locales/zh-CN.json')
const DIFFICULTY_KEYS = [
  'difficulty.weak',
  'difficulty.common',
  'difficulty.hero',
  'difficulty.hegemon',
  'difficulty.sage',
] as const

describe('zh-CN difficulty locale keys', () => {
  it('contains all five difficulty labels', () => {
    expect(existsSync(LOCALE_FILE)).toBe(true)

    const data = JSON.parse(readFileSync(LOCALE_FILE, 'utf-8')) as Record<string, string>

    for (const key of DIFFICULTY_KEYS) {
      expect(data[key]).toBeDefined()
      expect(data[key]).not.toBe('')
    }
  })
})
