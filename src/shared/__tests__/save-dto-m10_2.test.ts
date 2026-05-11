import { describe, expect, it } from 'vitest'

import { saveDtoToHintState } from '~/engine/world/save-dto'
import { saveDtoSchema } from '../schemas/save-dto'
import { SAVE_DTO_VERSION, type SaveDTO } from '../types/save-dto'

describe('SaveDTO v5 M10.2 fields', () => {
  it('SAVE_DTO_VERSION equals 5', () => {
    expect(SAVE_DTO_VERSION).toBe(5)
  })

  it('seenHints and hintsEnabled are optional in schema', () => {
    expect(saveDtoSchema.shape.seenHints).toBeTruthy()
    expect(saveDtoSchema.shape.hintsEnabled).toBeTruthy()
    expect(saveDtoSchema.shape.seenHints.safeParse(undefined).success).toBe(true)
    expect(saveDtoSchema.shape.hintsEnabled.safeParse(undefined).success).toBe(true)
  })

  it('saveDtoToHintState handles DTO with seenHints', () => {
    const dto = {
      schemaVersion: 5 as const,
      seenHints: { hint_reform: true as const, hint_war_received: true as const },
      hintsEnabled: false,
    } as unknown as SaveDTO

    const state = saveDtoToHintState(dto)

    expect(state.seenHints.hint_reform).toBe(true)
    expect(state.seenHints.hint_war_received).toBe(true)
    expect(state.hintsEnabled).toBe(false)
  })

  it('saveDtoToHintState defaults when fields absent (v3 backward compat)', () => {
    const v3ShapeDto = {
      schemaVersion: 3 as const,
    } as unknown as SaveDTO

    const state = saveDtoToHintState(v3ShapeDto)

    expect(state.seenHints).toEqual({})
    expect(state.hintsEnabled).toBe(true)
  })

  it('saveDtoToHintState preserves unknown hint ids (forward compat)', () => {
    const dto = {
      schemaVersion: 5 as const,
      seenHints: { hint_reform: true as const, hint_unknown_xxx: true as const },
      hintsEnabled: true,
    } as unknown as SaveDTO

    const state = saveDtoToHintState(dto)

    expect(state.seenHints.hint_reform).toBe(true)
    expect(state.seenHints.hint_unknown_xxx).toBe(true)
  })
})
