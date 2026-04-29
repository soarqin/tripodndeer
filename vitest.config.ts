import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    alias: { '@': resolve(__dirname, 'src') },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
