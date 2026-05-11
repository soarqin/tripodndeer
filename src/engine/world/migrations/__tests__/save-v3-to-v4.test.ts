import { describe, expect, it } from 'vitest'

import { type SaveDTOAnyVersion } from '~/shared/types/save-dto'
import { migrateSaveV3ToV4 } from '../save-v3-to-v4'

const v3Fixture = {
  schemaVersion: 3,
  scenarioId: 'm1',
  createdAt: 0,
  world: {},
} as unknown as SaveDTOAnyVersion

describe('migrateSaveV3ToV4', () => {
  it('sets schemaVersion to 4', () => {
    const result = migrateSaveV3ToV4(v3Fixture)

    expect(result.schemaVersion).toBe(4)
  })

  it('sets default seenHints to empty object', () => {
    const result = migrateSaveV3ToV4(v3Fixture)

    expect(result.seenHints).toEqual({})
  })

  it('sets default hintsEnabled to true', () => {
    const result = migrateSaveV3ToV4(v3Fixture)

    expect(result.hintsEnabled).toBe(true)
  })

  it('preserves all other v3 fields unchanged', () => {
    const v3WithData = {
      ...v3Fixture,
      world: { tick: 42 },
    } as unknown as SaveDTOAnyVersion

    const result = migrateSaveV3ToV4(v3WithData)

    expect((result.world as unknown as { tick: number }).tick).toBe(42)
  })

  it('does not throw on unknown extra fields in v3 DTO', () => {
    const v3WithExtra = {
      ...v3Fixture,
      unknownField: 'some value',
    } as unknown as SaveDTOAnyVersion

    expect(() => migrateSaveV3ToV4(v3WithExtra)).not.toThrow()
  })
})
