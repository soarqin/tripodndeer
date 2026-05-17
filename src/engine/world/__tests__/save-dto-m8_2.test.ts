import { describe, expect, it } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { saveDtoToWorld, worldToSaveDTO } from '~/engine/world/save-dto'
import { SaveDTOSchema } from '~/shared/schemas/save-dto'
import type { DiplomaticMemory, MemoryKey, World } from '~/shared/types'
import { SAVE_DTO_VERSION, type SaveDTO } from '~/shared/types/save-dto'

function createM1World(): World {
  return createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
}

function restore(dto: SaveDTO): World {
  const result = saveDtoToWorld(dto)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

describe('SaveDTO M8.2 V3 fields', () => {
  it('round-trips difficulty, diplomaticMemory, and ruler personalityDims', () => {
    const memoryKey: MemoryKey = 'realm_qin__realm_chu'
    const memory: DiplomaticMemory = {
      observerId: 'realm_qin',
      subjectId: 'realm_chu',
      betrayalScore: 7,
      events: [{ kind: 'unprovoked_war', tick: 12, weight: 4 }],
      lastUpdatedTick: 12,
      lastObservedHistoryIdx: 1,
    }
    const world: World = {
      ...createM1World(),
      difficulty: 'sage',
      diplomaticMemory: new Map([[memoryKey, memory]]),
      scenarioId: 'm1',
      tutorialState: null,
    }

    const dto = worldToSaveDTO(world)
    const parsed = SaveDTOSchema.parse(JSON.parse(JSON.stringify(dto)))
    const restored = restore(dto)

    expect(dto.schemaVersion).toBe(SAVE_DTO_VERSION)
    expect(parsed.world.difficulty).toBe('sage')
    expect(parsed.world.diplomaticMemory).toEqual([[memoryKey, memory]])
    expect(restored.difficulty).toBe(world.difficulty)
    expect(restored.diplomaticMemory).toEqual(world.diplomaticMemory)
    expect([...restored.rulers.values()].map((ruler) => ruler.personalityDims)).toEqual(
      [...world.rulers.values()].map((ruler) => ruler.personalityDims),
    )
  })

  it('rejects V2 fixtures with incompatible_version (no migration since M11)', () => {
    const dto = worldToSaveDTO({
      ...createM1World(),
      difficulty: 'hegemon',
      diplomaticMemory: new Map(),
    })
    const { difficulty: _difficulty, diplomaticMemory: _diplomaticMemory, ...v2World } = dto.world
    const v2Rulers = v2World.rulers.map(([realmId, ruler]) => {
      const { personalityDims: _personalityDims, ...v2Ruler } = ruler
      return [realmId, v2Ruler]
    })
    const v2Dto = {
      ...dto,
      schemaVersion: 2,
      world: { ...v2World, rulers: v2Rulers },
    } as unknown as SaveDTO

    const result = saveDtoToWorld(v2Dto)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('incompatible_version')
    }
  })
})
