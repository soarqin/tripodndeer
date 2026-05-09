import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('aiPersonality grep invariant', () => {
  it('finds no aiPersonality references outside tests', () => {
    const result = spawnSync(
      'sh',
      [
        '-lc',
        "grep -r 'aiPersonality' src/ --include='*.ts' --include='*.tsx' -l | grep -v '/__tests__/' | grep -v '.test.' || true",
      ],
      { encoding: 'utf8' }
    )

    expect(result.stdout.trim()).toBe('')
  })
})
