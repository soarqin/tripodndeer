import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const REALMS_DIR = join(__dirname, '../../m9/realms')

describe('M9 realm JSONs', () => {
  const files = readdirSync(REALMS_DIR).filter((f) => f.endsWith('.json'))

  it('has exactly 12 realm JSON files', () => {
    expect(files).toHaveLength(12)
  })

  files.forEach((file) => {
    describe(file, () => {
      const content = JSON.parse(readFileSync(join(REALMS_DIR, file), 'utf-8'))

      it('has archetype field', () => {
        expect(content).toHaveProperty('archetype')
      })

      it('does not have aiPersonality field', () => {
        expect(content).not.toHaveProperty('aiPersonality')
      })
    })
  })
})
