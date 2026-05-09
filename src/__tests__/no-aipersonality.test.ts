import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('aiPersonality production invariant', () => {
  it('finds no aiPersonality references in non-test ts files', () => {
    const result = spawnSync(
      'sh',
      [
        '-lc',
        "find src/ -name '*.ts' -not -name '*.test.ts' -exec grep -l 'aiPersonality' {} \\; || true",
      ],
      { encoding: 'utf8' }
    )

    expect(result.stdout.trim()).toBe('')
  })
})
