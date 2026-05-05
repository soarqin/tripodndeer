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
    include: [
      'src/engine/systems/ai/__tests__/m8-behavior*.test.ts',
      'src/__tests__/m9-history-default-gravity.test.ts',
    ],
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
})
