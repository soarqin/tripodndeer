import scenarioRaw from '@/content/m1/scenario.json'
import { describe, expect, it } from 'vitest'
import { migrateScenarioV1ToV3 } from '../v1-to-v3'

function makeLegacyV1WithAiPersonality(): Record<string, unknown> {
  const v1 = { ...scenarioRaw } as Record<string, unknown>
  delete v1.schema_version
  v1.realms = scenarioRaw.realms.map((realm, index) => {
    if (index === 0) return { ...realm, aiPersonality: 'aggressive' }
    if (index === 1) return { ...realm, aiPersonality: 'cautious' }
    return realm
  })
  return v1
}

describe('migrateScenarioV1ToV3 — archetype compatibility mapping', () => {
  it('maps legacy aiPersonality aggressive/cautious values to ruler archetypes', () => {
    const migrated = migrateScenarioV1ToV3(makeLegacyV1WithAiPersonality())

    expect(migrated.rulers.find(ruler => ruler.realmId === 'realm_qin')?.personality).toBe(
      'conqueror',
    )
    expect(migrated.rulers.find(ruler => ruler.realmId === 'realm_chu')?.personality).toBe(
      'steward',
    )
  })
})
