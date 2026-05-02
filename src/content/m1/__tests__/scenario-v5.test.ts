import { describe, it, expect } from 'vitest'
import scenarioJson from '../scenario.json'
import { M1DataSchemaV5 } from '~/shared/schemas'

describe('scenario v5 data compliance', () => {
  it('has schema_version === 5', () => {
    expect((scenarioJson as { schema_version?: number }).schema_version).toBe(5)
  })

  it('passes M1DataSchemaV5 parse', () => {
    expect(() => M1DataSchemaV5.parse(scenarioJson)).not.toThrow()
  })

  it('maintains 50 sites', () => {
    expect(scenarioJson.sites.length).toBe(50)
  })

  it('has 5 passes', () => {
    expect((scenarioJson as { passes?: unknown[] }).passes?.length).toBe(5)
  })

  it('all 8 realms have stats with correct defaults', () => {
    const data = M1DataSchemaV5.parse(scenarioJson)
    expect(data.realms.length).toBe(8)
    for (const realm of data.realms) {
      expect(realm.stats?.manpowerPool).toBe(50000)
      expect(realm.stats?.manpowerCap).toBe(80000)
      expect(realm.stats?.warWeariness).toBe(0)
    }
  })
})
