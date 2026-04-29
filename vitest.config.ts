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
    // Playwright owns the e2e/ tree; Vitest must not collect those specs or
    // it picks up @playwright/test globals and throws "did not expect
    // test.describe() to be called here".
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
})
