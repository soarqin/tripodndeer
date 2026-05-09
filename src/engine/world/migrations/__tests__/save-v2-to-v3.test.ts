import { describe, expect, it } from 'vitest'

import { M5_PERSONALITY_DIMS_BASELINE } from '~/content/m2/balance'
import { saveDtoToWorld } from '~/engine/world/save-dto'
import { SaveDTOSchema } from '~/shared/schemas/save-dto'
import { SAVE_DTO_VERSION, type SaveDTO } from '~/shared/types/save-dto'
import { migrateSaveV2ToV3 } from '../save-v2-to-v3'
import saveV2Fixture from './fixtures/save-v2.json'

const saveV2 = saveV2Fixture as unknown as SaveDTO
const saveV2FixtureWorld = saveV2Fixture.world as unknown as Record<string, unknown> & {
  rulers: Array<[string, Record<string, unknown>]>
}

describe('migrateSaveV2ToV3', () => {
  it("defaults difficulty to 'hero', diplomaticMemory to empty, and derives ruler personalityDims", () => {
    const migrated = migrateSaveV2ToV3(saveV2)

    expect(migrated.schemaVersion).toBe(SAVE_DTO_VERSION)
    expect(migrated.world.difficulty).toBe('hero')
    expect(migrated.world.diplomaticMemory).toEqual([])
    expect(migrated.world.rulers[0]?.[1].personalityDims).toEqual(
      M5_PERSONALITY_DIMS_BASELINE.conqueror,
    )
    expect(SaveDTOSchema.parse(migrated)).toEqual(migrated)
  })

  it('does not mutate the V2 fixture', () => {
    const before = JSON.stringify(saveV2Fixture)

    migrateSaveV2ToV3(saveV2)

    expect(JSON.stringify(saveV2Fixture)).toBe(before)
    expect('difficulty' in saveV2FixtureWorld).toBe(false)
    expect('diplomaticMemory' in saveV2FixtureWorld).toBe(false)
    expect('personalityDims' in saveV2FixtureWorld.rulers[0]![1]).toBe(false)
  })

  it('loads the V2 fixture through saveDtoToWorld', () => {
    const result = saveDtoToWorld(saveV2)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error.message)
    expect(result.value.difficulty).toBe('hero')
    expect(result.value.diplomaticMemory.size).toBe(0)
    expect(result.value.rulers.get('realm_qin')?.personalityDims).toEqual(
      M5_PERSONALITY_DIMS_BASELINE.conqueror,
    )
  })
})
