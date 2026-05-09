import { describe, expect, it } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { saveDtoToWorld, worldToSaveDTO } from '~/engine/world/save-dto'
import { M1DataSchemaV8 } from '~/shared/schemas/world'
import { SAVE_DTO_VERSION, type SaveDTO } from '~/shared/types/save-dto'

describe('SaveDTO M8.1 - V2 with aiState forward-compat', () => {
  it('SAVE_DTO_VERSION is 3', () => {
    expect(SAVE_DTO_VERSION).toBe(3)
  })

  it('World.schema_version is still 8 (independent version system)', () => {
    expect(M1DataSchemaV8.shape.schema_version.value).toBe(8)
  })

  it('worldToSaveDTO writes schemaVersion=3 and empty aiState', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world)

    expect(dto.schemaVersion).toBe(3)
    expect(dto.world.aiState).toEqual([])
  })

  it('V2 save DTO with aiState=[] round-trips via saveDtoToWorld', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world)
    const result = saveDtoToWorld(dto)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error.message)
    expect(result.value.sites.size).toBe(world.sites.size)
  })

  it('V1 save DTO (missing aiState) loads via saveDtoToWorld without crash', () => {
    const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
    const v2Dto = worldToSaveDTO(world)
    const v1World = { ...v2Dto.world } as Record<string, unknown>
    delete v1World.aiState
    const v1Dto = {
      ...v2Dto,
      schemaVersion: 1,
      world: v1World,
    } as unknown as SaveDTO

    const result = saveDtoToWorld(v1Dto)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error.message)
    expect(result.value.sites.size).toBe(world.sites.size)
  })

  it('rejects unsupported SaveDTO versions (e.g. 999)', () => {
    const dto = worldToSaveDTO(createWorldFromM1Data(loadM1Data(), 42, 'realm_qin'))
    const incompatible = { ...dto, schemaVersion: 999 } as unknown as SaveDTO

    const result = saveDtoToWorld(incompatible)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected incompatible version failure')
    expect(result.error.kind).toBe('incompatible_version')
    expect(result.error.got).toBe(999)
    expect(result.error.expected).toBe(SAVE_DTO_VERSION)
  })
})
