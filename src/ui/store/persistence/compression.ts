import { compressToUTF16, decompressFromUTF16 } from 'lz-string'

/**
 * Sentinel prefix marking an LZ-compressed payload. Uses non-printable control
 * characters so it cannot collide with a legacy uncompressed JSON string
 * (which always begins with `{` or `"`).
 */
const COMPRESSED_PREFIX = '\x00lz\x00'

export function compressWorld(serialized: string): string {
  const result = compressToUTF16(serialized)
  return COMPRESSED_PREFIX + result
}

export function decompressWorld(compressed: string): string {
  if (!isCompressed(compressed)) return compressed // legacy uncompressed
  const payload = compressed.slice(COMPRESSED_PREFIX.length)
  const result = decompressFromUTF16(payload)
  if (result === null) throw new Error('LZ decompress returned null — corrupt input')
  return result
}

export function isCompressed(payload: unknown): boolean {
  return typeof payload === 'string' && payload.startsWith(COMPRESSED_PREFIX)
}
