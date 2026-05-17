import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { compressWorld, decompressWorld } from '~/ui/store/persistence/compression'
import { getDb, resetDbForTesting, type SaveMetadata } from '~/ui/store/persistence/db'
import { loadSlot, saveSlot } from '~/ui/store/persistence/slot-crud'
import { createWorldFromM9Data, loadM9Data } from '../factory'
import { worldToSaveDTO } from '../save-dto'

beforeEach(async () => {
  resetDbForTesting()
  const db = await getDb()
  await db.clear('saves')
  resetDbForTesting()
})

describe('SaveDTO world compression round-trip (M9)', () => {
  it('M9 world → JSON.stringify → compress → decompress → JSON.parse equals original world serialization', async () => {
    const world = createWorldFromM9Data(await loadM9Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world, 'm9', { seenHints: {}, hintsEnabled: true })

    const serialized = JSON.stringify(dto.world)
    const compressed = compressWorld(serialized)
    const decompressed = decompressWorld(compressed)
    const parsed = JSON.parse(decompressed)

    expect(parsed).toEqual(JSON.parse(serialized))
  })

  it('saveSlot → loadSlot round-trip preserves world.sites count for M9 starter (compressed in IDB)', async () => {
    const world = createWorldFromM9Data(await loadM9Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world, 'm9', { seenHints: {}, hintsEnabled: true })
    const metadata: SaveMetadata = {
      slotId: 'slot1',
      name: 'M9 starter',
      createdAt: dto.createdAt,
      tick: dto.world.tick,
      scenarioId: dto.scenarioId,
      playerRealmName: world.realms.get(world.playerRealmId)?.displayName ?? '',
    }

    await saveSlot('slot1', dto, metadata)
    const result = await loadSlot('slot1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.dto.world.sites.length).toBe(dto.world.sites.length)
    expect(result.value.dto.scenarioId).toBe('m9')
    expect(result.value.dto.world.playerRealmId).toBe('realm_qin')
  })

  it('IDB physical record stores world as a compressed string (not an object)', async () => {
    const world = createWorldFromM9Data(await loadM9Data(), 42, 'realm_qin')
    const dto = worldToSaveDTO(world, 'm9', { seenHints: {}, hintsEnabled: true })
    const metadata: SaveMetadata = {
      slotId: 'slot1',
      name: 'M9 starter',
      createdAt: dto.createdAt,
      tick: dto.world.tick,
      scenarioId: dto.scenarioId,
      playerRealmName: '',
    }

    await saveSlot('slot1', dto, metadata)

    const db = await getDb()
    const record = await db.get('saves', 'slot1')
    expect(record).toBeDefined()
    const storedDto = record!.dto as { world: unknown }
    expect(typeof storedDto.world).toBe('string')
  })
})
