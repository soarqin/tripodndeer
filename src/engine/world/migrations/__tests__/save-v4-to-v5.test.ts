import { describe, expect, it } from 'vitest'

import { SAVE_DTO_VERSION, type SaveDTOAnyVersion } from '~/shared/types/save-dto'
import { migrateSaveV2ToV3 } from '../save-v2-to-v3'
import { migrateSaveV3ToV4 } from '../save-v3-to-v4'
import { migrateSaveV4ToV5 } from '../save-v4-to-v5'

const v4Fixture = {
  schemaVersion: 4,
  scenarioId: 'm1',
  createdAt: 0,
  world: { sites: [] },
} as unknown as SaveDTOAnyVersion

describe('migrateSaveV4ToV5', () => {
  it('sets schemaVersion to 5', () => {
    const result = migrateSaveV4ToV5(v4Fixture)

    expect(result.schemaVersion).toBe(5)
    expect(result.schemaVersion).toBe(SAVE_DTO_VERSION)
  })

  it('defaults tutorialState to null', () => {
    const result = migrateSaveV4ToV5(v4Fixture)

    expect(result.tutorialState).toBeNull()
  })

  it('preserves explicit scenarioId from v4 dto', () => {
    const v4WithScenario = {
      ...v4Fixture,
      scenarioId: 'm9',
    } as unknown as SaveDTOAnyVersion

    const result = migrateSaveV4ToV5(v4WithScenario)

    expect(result.scenarioId).toBe('m9')
  })

  it('infers m9 scenarioId from large sites array when missing', () => {
    const sites = Array.from({ length: 250 }, (_, i) => [`site_${i}`, {}])
    const v4WithoutScenario = {
      schemaVersion: 4,
      createdAt: 0,
      world: { sites },
    } as unknown as SaveDTOAnyVersion

    const result = migrateSaveV4ToV5(v4WithoutScenario)

    expect(result.scenarioId).toBe('m9')
  })

  it('infers m1 scenarioId from small sites array when missing', () => {
    const sites = Array.from({ length: 50 }, (_, i) => [`site_${i}`, {}])
    const v4WithoutScenario = {
      schemaVersion: 4,
      createdAt: 0,
      world: { sites },
    } as unknown as SaveDTOAnyVersion

    const result = migrateSaveV4ToV5(v4WithoutScenario)

    expect(result.scenarioId).toBe('m1')
  })

  it('preserves all other v4 fields unchanged', () => {
    const v4WithData = {
      ...v4Fixture,
      world: { sites: [], tick: 42 },
      seenHints: { hint_reform: true },
      hintsEnabled: false,
    } as unknown as SaveDTOAnyVersion

    const result = migrateSaveV4ToV5(v4WithData)

    expect((result.world as unknown as { tick: number }).tick).toBe(42)
    expect(result.seenHints).toEqual({ hint_reform: true })
    expect(result.hintsEnabled).toBe(false)
  })

  it('does not throw on unknown extra fields in v4 DTO', () => {
    const v4WithExtra = {
      ...v4Fixture,
      unknownField: 'some value',
    } as unknown as SaveDTOAnyVersion

    expect(() => migrateSaveV4ToV5(v4WithExtra)).not.toThrow()
  })

  it('is pure: same input produces equal output', () => {
    const a = migrateSaveV4ToV5(v4Fixture)
    const b = migrateSaveV4ToV5(v4Fixture)

    expect(a).toEqual(b)
  })

  it('chains v3 → v4 → v5 with all defaults populated', () => {
    const v3 = {
      schemaVersion: 3,
      scenarioId: 'm1',
      createdAt: 0,
      world: { sites: [] },
    } as unknown as SaveDTOAnyVersion

    const v4 = migrateSaveV3ToV4(v3)
    const v5 = migrateSaveV4ToV5(v4)

    expect(v4.schemaVersion).toBe(4)
    expect(v5.schemaVersion).toBe(5)
    expect(v5.seenHints).toEqual({})
    expect(v5.hintsEnabled).toBe(true)
    expect(v5.tutorialState).toBeNull()
    expect(v5.scenarioId).toBe('m1')
  })

  it('chains v2 → v3 → v4 → v5 preserving v2 defaults', () => {
    const v2 = {
      schemaVersion: 2,
      scenarioId: 'm1',
      createdAt: 0,
      world: {
        sites: [],
        rulers: [],
      },
    } as unknown as SaveDTOAnyVersion

    const v3 = migrateSaveV2ToV3(v2)
    const v4 = migrateSaveV3ToV4(v3)
    const v5 = migrateSaveV4ToV5(v4)

    expect(v3.schemaVersion).toBe(3)
    expect(v4.schemaVersion).toBe(4)
    expect(v5.schemaVersion).toBe(5)
    expect(v5.tutorialState).toBeNull()
  })
})
