import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

import {
  M11_COMPRESSION_SPEED_MS,
  M11_COMPRESSION_TARGET_KB,
} from '~/content/m2/balance/m11'
import { compressWorld } from '~/ui/store/persistence/compression'
import { createWorldFromM9Data, loadM9Data } from '../factory'
import { worldToSaveDTO } from '../save-dto'

function byteSizeUtf16(s: string): number {
  return s.length * 2
}

describe('SaveDTO compression perf (M9 starter)', () => {
  it(
    `compresses M9 starter world to < ${M11_COMPRESSION_TARGET_KB}KB and < ${M11_COMPRESSION_SPEED_MS}ms (median of 5 runs)`,
    async () => {
      const world = createWorldFromM9Data(await loadM9Data(), 42, 'realm_qin')
      const dto = worldToSaveDTO(world, 'm9', { seenHints: {}, hintsEnabled: true })
      const serialized = JSON.stringify(dto.world)

      const durations: number[] = []
      let lastCompressed = ''
      for (let i = 0; i < 5; i++) {
        const start = performance.now()
        lastCompressed = compressWorld(serialized)
        durations.push(performance.now() - start)
      }
      durations.sort((a, b) => a - b)
      const medianMs = durations[2]!

      const compressedBytes = byteSizeUtf16(lastCompressed)
      const compressedKB = compressedBytes / 1024
      const uncompressedKB = (serialized.length * 2) / 1024
      const ratio = compressedKB / uncompressedKB

      const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
      if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
      fs.writeFileSync(
        path.join(evidenceDir, 'task-8-compression-size.txt'),
        [
          `M9 starter compression perf`,
          `uncompressed: ${uncompressedKB.toFixed(2)} KB (UTF-16)`,
          `compressed:   ${compressedKB.toFixed(2)} KB (UTF-16)`,
          `ratio:        ${(ratio * 100).toFixed(2)}%`,
          `compress ms:  median=${medianMs.toFixed(2)} (samples=${durations.map(d => d.toFixed(2)).join(',')})`,
          `target:       < ${M11_COMPRESSION_TARGET_KB}KB, < ${M11_COMPRESSION_SPEED_MS}ms`,
          `timestamp:    ${new Date().toISOString()}`,
        ].join('\n') + '\n',
        'utf-8',
      )

      expect(
        compressedKB,
        `M9 starter compressed size ${compressedKB.toFixed(2)}KB should be < ${M11_COMPRESSION_TARGET_KB}KB`,
      ).toBeLessThan(M11_COMPRESSION_TARGET_KB)
      expect(
        medianMs,
        `M9 starter compress median ${medianMs.toFixed(2)}ms should be < ${M11_COMPRESSION_SPEED_MS}ms`,
      ).toBeLessThan(M11_COMPRESSION_SPEED_MS)
    },
    { timeout: 60000 },
  )
})
