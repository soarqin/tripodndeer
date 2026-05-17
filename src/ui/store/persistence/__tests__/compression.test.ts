import { describe, expect, it, vi } from 'vitest'

import { compressWorld, decompressWorld, isCompressed } from '../compression'

function randomString(seed: number, length: number): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}[]":, '
  let acc = ''
  let state = seed
  for (let i = 0; i < length; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    acc += charset[state % charset.length]
  }
  return acc
}

describe('compression', () => {
  describe('round-trip identity', () => {
    it('compress→decompress returns the original string for 100 deterministic inputs', () => {
      for (let i = 0; i < 100; i++) {
        const length = 32 + (i % 64) * 16
        const input = randomString(i + 1, length)
        const compressed = compressWorld(input)
        const decompressed = decompressWorld(compressed)
        expect(decompressed).toBe(input)
      }
    })

    it('handles empty string', () => {
      const compressed = compressWorld('')
      expect(decompressWorld(compressed)).toBe('')
    })

    it('handles JSON-shaped payload with all character classes', () => {
      const input = '{"key":"值","array":[1,2,3.14,null,true,false],"nested":{"inner":"\\n\\t"}}'
      expect(decompressWorld(compressWorld(input))).toBe(input)
    })
  })

  describe('isCompressed', () => {
    it('returns true for compressWorld output', () => {
      expect(isCompressed(compressWorld('hello'))).toBe(true)
    })

    it('returns false for plain string without sentinel prefix', () => {
      expect(isCompressed('{"json":"data"}')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isCompressed('')).toBe(false)
    })

    it('returns false for non-string values', () => {
      expect(isCompressed(123)).toBe(false)
      expect(isCompressed({})).toBe(false)
      expect(isCompressed(null)).toBe(false)
      expect(isCompressed(undefined)).toBe(false)
    })
  })

  describe('decompressWorld lenient path', () => {
    it('returns input unchanged if not compressed (legacy uncompressed)', () => {
      const plain = '{"already":"plain"}'
      expect(decompressWorld(plain)).toBe(plain)
    })
  })

  describe('decompressWorld error path', () => {
    it('throws when lz-string returns null (corrupt input)', async () => {
      vi.resetModules()
      vi.doMock('lz-string', () => ({
        compressToUTF16: (s: string) => `MOCK_${s}`,
        decompressFromUTF16: () => null,
      }))
      const mod = await import('../compression')
      const fakeCompressed = mod.compressWorld('payload')
      expect(() => mod.decompressWorld(fakeCompressed)).toThrow(
        /LZ decompress returned null/,
      )
      vi.doUnmock('lz-string')
      vi.resetModules()
    })
  })
})
