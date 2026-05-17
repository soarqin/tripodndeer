import { describe, expect, it } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { worldToSaveDTO } from '~/engine/world/save-dto'
import { SaveDTOSchema } from '~/shared/schemas/save-dto'
import { SAVE_DTO_VERSION } from '~/shared/types/save-dto'

const V6_REQUIRED_FIELDS = [
  'createdAt',
  'scenarioId',
  'scenarioVersion',
  'schemaVersion',
  'tutorialState',
  'world',
] as const

const V6_OPTIONAL_FIELDS = ['hintsEnabled', 'seenHints'] as const

const V6_ALL_FIELDS_SORTED = [...V6_REQUIRED_FIELDS, ...V6_OPTIONAL_FIELDS].sort()

describe('SaveDTO v6 field stability (frozen manifest)', () => {
  it('SAVE_DTO_VERSION is 6', () => {
    expect(SAVE_DTO_VERSION).toBe(6)
  })

  it('worldToSaveDTO emits exactly the frozen v6 field set', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world, 'm1', { seenHints: {}, hintsEnabled: true })

    const actual = Object.keys(dto).sort()
    expect(actual).toEqual(V6_ALL_FIELDS_SORTED)
  })

  it('every required v6 field is present in DTO', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world, 'm1')

    for (const key of V6_REQUIRED_FIELDS) {
      expect(dto, `required field ${key} missing`).toHaveProperty(key)
    }
  })

  it('SaveDTOSchema requires every frozen required field', () => {
    const schemaKeys = Object.keys(SaveDTOSchema.shape).sort()
    expect(schemaKeys).toEqual(V6_ALL_FIELDS_SORTED)

    for (const key of V6_REQUIRED_FIELDS) {
      const field = SaveDTOSchema.shape[key as keyof typeof SaveDTOSchema.shape]
      expect(field.safeParse(undefined).success, `${key} must be required`).toBe(false)
    }

    for (const key of V6_OPTIONAL_FIELDS) {
      const field = SaveDTOSchema.shape[key as keyof typeof SaveDTOSchema.shape]
      expect(field.safeParse(undefined).success, `${key} must be optional`).toBe(true)
    }
  })

  it('scenarioVersion is a non-empty string sourced from M11 scenario versions', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world, 'm1')

    expect(typeof dto.scenarioVersion).toBe('string')
    expect(dto.scenarioVersion.length).toBeGreaterThan(0)
    expect(dto.scenarioVersion).toBe('1.0.0')
  })

  it('tutorialState is always present (null for non-tutorial scenarios)', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world, 'm1')

    expect(dto).toHaveProperty('tutorialState')
    expect(dto.tutorialState).toBeNull()
  })
})
