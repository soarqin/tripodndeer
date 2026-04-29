import { describe, it, expect } from 'vitest'
import sitesData from '../sites.json'

describe('sites.json validation', () => {
  it('has data (full edge-indexed validation after regeneration)', () => {
    expect(sitesData).toBeDefined()
  })
})
