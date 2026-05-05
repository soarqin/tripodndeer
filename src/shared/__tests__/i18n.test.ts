import { describe, it, expect } from 'vitest'
import { loadLocale, t } from '../i18n'

describe('i18n core', () => {
  it('t() returns zh-CN string for known key', () => {
    const map = loadLocale({ 'event.foo.text': '测试文本' })
    expect(t(map, 'event.foo.text')).toBe('测试文本')
  })

  it('t() returns [MISSING:key] for unknown key in dev mode', () => {
    const map = loadLocale({})
    const result = t(map, 'missing.key')
    expect(result).toMatch(/MISSING|key/)
  })

  it('t() replaces {{var}} params', () => {
    const map = loadLocale({ 'event.foo': '{{realm}}称王' })
    expect(t(map, 'event.foo', { realm: '秦' })).toBe('秦称王')
  })

  it('loadLocale() throws on invalid input', () => {
    expect(() => loadLocale(null)).toThrow()
    expect(() => loadLocale('string')).toThrow()
    expect(() => loadLocale([1, 2, 3])).toThrow()
  })

  it('loadLocale() returns ReadonlyMap', () => {
    const map = loadLocale({ 'a.b': 'value' })
    expect(map.get('a.b')).toBe('value')
    expect(map.size).toBe(1)
  })
})
