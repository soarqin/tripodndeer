import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': resolve(rootDir, 'src'), '~': resolve(rootDir, 'src') },
  },
  test: {
    globals: true,
    alias: { '@': resolve(rootDir, 'src'), '~': resolve(rootDir, 'src') },
    environmentMatchGlobs: [
      ['src/ui/**', 'jsdom'],
      ['src/rendering/**', 'jsdom'],
    ],
    environment: 'node',
    exclude: [
      'node_modules',
      'dist',
      'src/__tests__/perf.test.ts',
      'src/__tests__/m4_1-perf.test.ts',
      'src/__tests__/m42-perf.test.ts',
      'src/__tests__/m5-perf.test.ts',
      'src/__tests__/m6-perf.test.ts',
      'src/__tests__/m7-perf.test.ts',
      'src/__tests__/m8-perf-determinism.test.ts',
      'src/__tests__/m8_1-perf.test.ts',
      'src/__tests__/m9-perf-checkpoint.test.ts',
      'src/engine/systems/ai/__tests__/baseline-capture.test.ts',
      'src/__tests__/m9-history-default-gravity.test.ts',
      'src/engine/systems/ai/__tests__/m8-behavior*.test.ts',
    ],
  },
})
