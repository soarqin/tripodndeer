import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const scenarioPath = join(__dirname, '../../m1/scenario.json')

describe('M1 scenario.json', () => {
  it('has no aiPersonality fields', () => {
    const raw = readFileSync(scenarioPath, 'utf-8')
    expect(raw).not.toContain('"aiPersonality"')
  })
})
