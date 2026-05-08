import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { worldToSaveDTO } from '~/engine/world/save-dto'
import { SAVE_DTO_VERSION } from '~/shared/types/save-dto'
import { getDb, resetDbForTesting, type SaveMetadata } from '../db'
import { deleteSlot, listSlots, loadSlot, saveSlot } from '../slot-crud'

function makeDtoAndMetadata(): { dto: ReturnType<typeof worldToSaveDTO>; metadata: SaveMetadata } {
  const world = createWorldFromM1Data(loadM1Data(), 42, 'realm_qin')
  const dto = worldToSaveDTO(world, 'm1')
  const playerRealmName = world.realms.get(world.playerRealmId)?.displayName ?? ''

  return {
    dto,
    metadata: {
      slotId: 'slot1',
      name: 'Test Save',
      createdAt: dto.createdAt,
      tick: dto.world.tick,
      scenarioId: dto.scenarioId,
      playerRealmName,
    },
  }
}

beforeEach(async () => {
  resetDbForTesting()
  const db = await getDb()
  await db.clear('saves')
  resetDbForTesting()
})

describe('slot-crud', () => {
  it('round-trips a save slot', async () => {
    const { dto, metadata } = makeDtoAndMetadata()

    await saveSlot('slot1', dto, metadata)
    const result = await loadSlot('slot1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.slotId).toBe('slot1')
    expect(result.value.dto).toEqual(dto)
    expect(result.value.metadata).toEqual(metadata)
  })

  it('lists saved slot metadata', async () => {
    const { dto, metadata } = makeDtoAndMetadata()

    await saveSlot('slot1', dto, metadata)

    expect(await listSlots()).toEqual([metadata])
  })

  it('returns missing_data after deleting a slot', async () => {
    const { dto, metadata } = makeDtoAndMetadata()

    await saveSlot('slot1', dto, metadata)
    await deleteSlot('slot1')

    const result = await loadSlot('slot1')
    expect(result).toEqual({
      ok: false,
      error: { kind: 'missing_data', message: 'Slot slot1 is empty' },
    })
  })

  it('returns incompatible_version for unsupported save versions', async () => {
    const { dto, metadata } = makeDtoAndMetadata()
    const db = await getDb()

    await db.put('saves', { slotId: 'slot1', dto: { ...dto, schemaVersion: 0 }, metadata })

    const result = await loadSlot('slot1')
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'incompatible_version',
        message: 'Incompatible save version',
        got: 0,
        expected: SAVE_DTO_VERSION,
      },
    })
  })
})
