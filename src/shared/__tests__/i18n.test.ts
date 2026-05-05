import { describe, it, expect } from 'vitest'
import { loadLocale, t, resolveText } from '../i18n'

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

  it('resolveText() returns string as-is for legacy M5 direct-string format', () => {
    const map = loadLocale({})
    expect(resolveText(map, '秦昭襄王索和氏璧')).toBe('秦昭襄王索和氏璧')
  })

  it('resolveText() looks up key for M6/M7 key-based format', () => {
    const map = loadLocale({ 'event.foo.text': '册封大典' })
    expect(resolveText(map, { key: 'event.foo.text' })).toBe('册封大典')
  })

  it('resolveText() forwards params to t() for key-based format', () => {
    const map = loadLocale({ 'event.bar': '{{realm}}的礼制' })
    expect(resolveText(map, { key: 'event.bar' }, { realm: '齐' })).toBe('齐的礼制')
  })
})
