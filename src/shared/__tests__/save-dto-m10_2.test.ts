import { describe, expect, it } from 'vitest'

import { saveDtoToHintState } from '~/engine/world/save-dto'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { worldToSaveDTO } from '~/engine/world/save-dto'
import { saveDtoSchema } from '../schemas/save-dto'
import { SAVE_DTO_VERSION, type SaveDTO } from '../types/save-dto'

describe('SaveDTO v6 M10.2 fields', () => {
  it('SAVE_DTO_VERSION equals 6', () => {
    expect(SAVE_DTO_VERSION).toBe(6)
  })

  it('seenHints and hintsEnabled are optional in schema', () => {
    expect(saveDtoSchema.shape.seenHints).toBeTruthy()
    expect(saveDtoSchema.shape.hintsEnabled).toBeTruthy()
    expect(saveDtoSchema.shape.seenHints.safeParse(undefined).success).toBe(true)
    expect(saveDtoSchema.shape.hintsEnabled.safeParse(undefined).success).toBe(true)
  })

  it('saveDtoToHintState handles DTO with seenHints', () => {
    const dto = {
      schemaVersion: 6 as const,
      seenHints: { hint_reform: true as const, hint_war_received: true as const },
      hintsEnabled: false,
    } as unknown as SaveDTO

    const state = saveDtoToHintState(dto)

    expect(state.seenHints.hint_reform).toBe(true)
    expect(state.seenHints.hint_war_received).toBe(true)
    expect(state.hintsEnabled).toBe(false)
  })

  it('saveDtoToHintState defaults when fields absent', () => {
    const minimalDto = {
      schemaVersion: 6 as const,
    } as unknown as SaveDTO

    const state = saveDtoToHintState(minimalDto)

    expect(state.seenHints).toEqual({})
    expect(state.hintsEnabled).toBe(true)
  })

  it('saveDtoToHintState preserves unknown hint ids (forward compat)', () => {
    const dto = {
      schemaVersion: 6 as const,
      seenHints: { hint_reform: true as const, hint_unknown_xxx: true as const },
      hintsEnabled: true,
    } as unknown as SaveDTO

    const state = saveDtoToHintState(dto)

    expect(state.seenHints.hint_reform).toBe(true)
    expect(state.seenHints.hint_unknown_xxx).toBe(true)
  })

  it('should round-trip seenHints and hintsEnabled in worldToSaveDTO', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world, 'm1', {
      seenHints: { 'first-conquest': true, 'dynasty-fall': true },
      hintsEnabled: false,
    })

    expect(dto.seenHints).toEqual({ 'first-conquest': true, 'dynasty-fall': true })
    expect(dto.hintsEnabled).toBe(false)
  })

  it('defaults seenHints and hintsEnabled when hintState is omitted', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world)

    expect(dto.seenHints).toEqual({})
    expect(dto.hintsEnabled).toBe(true)
  })
})
