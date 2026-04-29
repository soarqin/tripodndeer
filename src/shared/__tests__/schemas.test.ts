import { describe, it, expect } from 'vitest'
import { M0DataSchema } from '../schemas'

const validSite = {
  id: 'site_1',
  name: '邑甲',
  position: [100, 200],
  polygon: [[90, 190], [110, 190], [115, 205], [100, 215], [85, 205]],
  adjacency: ['site_2'],
}
const validFaction = {
  id: 'faction_red',
  displayName: '红',
  color: '#dc2626',
}
const validData = {
  sites: [validSite],
  factions: [validFaction],
  initialOwnership: { site_1: 'faction_red' },
}

describe('M0DataSchema valid', () => {
  it('accepts valid m0 data', () => {
    expect(() => M0DataSchema.parse(validData)).not.toThrow()
  })

  it('returns typed object on valid data', () => {
    const result = M0DataSchema.parse(validData)
    expect(result.sites[0]?.id).toBe('site_1')
    expect(result.factions[0]?.color).toBe('#dc2626')
    expect(result.initialOwnership['site_1']).toBe('faction_red')
  })
})

describe('M0DataSchema invalid', () => {
  it('rejects site missing polygon field', () => {
    const bad = { ...validData, sites: [{ ...validSite, polygon: undefined }] }
    expect(() => M0DataSchema.parse(bad)).toThrow()
  })

  it('rejects site with invalid polygon (less than 3 points)', () => {
    const bad = { ...validData, sites: [{ ...validSite, polygon: [[0, 0], [1, 1]] }] }
    expect(() => M0DataSchema.parse(bad)).toThrow()
  })

  it('rejects faction with invalid color', () => {
    const bad = { ...validData, factions: [{ ...validFaction, color: 'red' }] }
    expect(() => M0DataSchema.parse(bad)).toThrow()
  })

  it('rejects data with wrong types', () => {
    const bad = { ...validData, sites: 'not-an-array' }
    expect(() => M0DataSchema.parse(bad)).toThrow()
  })
})
