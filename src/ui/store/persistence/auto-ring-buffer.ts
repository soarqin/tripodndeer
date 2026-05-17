import { compressWorld } from './compression'
import { getDb, type SaveMetadata } from './db'
import { AUTO_SLOT_IDS, type AutoSlotId } from './slot-crud'
import { SaveDTOSchema } from '~/shared/schemas/save-dto'
import type { SaveDTO } from '~/shared/types/save-dto'

interface StoredAutoSaveDTO {
  schemaVersion: number
  scenarioId: string
  scenarioVersion: string
  createdAt: number
  tutorialState: unknown
  seenHints?: unknown
  hintsEnabled?: unknown
  world: string
}

interface StoredAutoSaveRecord {
  slotId: string
  dto: StoredAutoSaveDTO
  metadata: SaveMetadata
}

function isAutoSlotId(slotId: string): slotId is AutoSlotId {
  return (AUTO_SLOT_IDS as readonly string[]).includes(slotId)
}

function pickTargetSlot(autoRecords: readonly StoredAutoSaveRecord[]): AutoSlotId {
  if (autoRecords.length < AUTO_SLOT_IDS.length) {
    const usedIds = new Set(autoRecords.map(r => r.slotId))
    return AUTO_SLOT_IDS.find(id => !usedIds.has(id)) ?? AUTO_SLOT_IDS[0]
  }
  const oldest = autoRecords.reduce((min, r) =>
    r.metadata.createdAt < min.metadata.createdAt ? r : min,
  )
  return oldest.slotId as AutoSlotId
}

export async function writeAutoRingBuffer(dto: SaveDTO, metadata: SaveMetadata): Promise<void> {
  SaveDTOSchema.parse(dto)

  const worldStr = JSON.stringify(dto.world)
  const compressedWorld = compressWorld(worldStr)
  const storedDto: StoredAutoSaveDTO = {
    schemaVersion: dto.schemaVersion,
    scenarioId: dto.scenarioId,
    scenarioVersion: dto.scenarioVersion,
    createdAt: dto.createdAt,
    tutorialState: dto.tutorialState,
    seenHints: dto.seenHints,
    hintsEnabled: dto.hintsEnabled,
    world: compressedWorld,
  }

  const db = await getDb()
  const tx = db.transaction('saves', 'readwrite')
  const store = tx.objectStore('saves')

  const allRecords = (await store.getAll()) as readonly StoredAutoSaveRecord[]
  const autoRecords = allRecords.filter(r => isAutoSlotId(r.slotId))
  const targetSlotId = pickTargetSlot(autoRecords)

  const writtenMetadata: SaveMetadata = { ...metadata, slotId: targetSlotId }
  const record: StoredAutoSaveRecord = {
    slotId: targetSlotId,
    dto: storedDto,
    metadata: writtenMetadata,
  }

  await store.put(record)
  await tx.done
}
