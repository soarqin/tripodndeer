import { getDb, type SaveMetadata } from './db'
import { SUPPORTED_SAVE_DTO_VERSIONS } from '~/engine/world/save-dto'
import { SaveDTOSchema } from '~/shared/schemas/save-dto'
import { SAVE_DTO_VERSION, type Result, type SaveDTO, type SaveLoadError } from '~/shared/types/save-dto'

export const SLOT_IDS = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'auto'] as const
export type SlotId = (typeof SLOT_IDS)[number]

export interface SaveSlot {
  slotId: SlotId
  dto: SaveDTO
  metadata: SaveMetadata
}

function readSchemaVersion(value: unknown): number | null {
  if (typeof value !== 'object' || value === null || !('schemaVersion' in value)) return null
  const schemaVersion = value.schemaVersion
  return typeof schemaVersion === 'number' ? schemaVersion : null
}

export async function saveSlot(slotId: SlotId, dto: SaveDTO, metadata: SaveMetadata): Promise<void> {
  SaveDTOSchema.parse(dto)
  const db = await getDb()
  await db.put('saves', { slotId, dto, metadata })
}

export async function loadSlot(slotId: SlotId): Promise<Result<SaveSlot, SaveLoadError>> {
  const db = await getDb()
  const record = await db.get('saves', slotId)
  if (!record) {
    return { ok: false, error: { kind: 'missing_data', message: `Slot ${slotId} is empty` } }
  }

  const schemaVersion = readSchemaVersion(record.dto)
  if (schemaVersion !== null && !SUPPORTED_SAVE_DTO_VERSIONS.includes(schemaVersion)) {
    return {
      ok: false,
      error: {
        kind: 'incompatible_version',
        message: 'Incompatible save version',
        got: schemaVersion,
        expected: SAVE_DTO_VERSION,
      },
    }
  }

  const parsed = SaveDTOSchema.safeParse(record.dto)
  if (!parsed.success) {
    return { ok: false, error: { kind: 'parse_error', message: parsed.error.message } }
  }

  const dto = parsed.data as unknown as SaveDTO
  return { ok: true, value: { slotId, dto, metadata: record.metadata } }
}

export async function listSlots(): Promise<SaveMetadata[]> {
  const db = await getDb()
  const all = await db.getAll('saves')
  return all.map(record => record.metadata)
}

export async function deleteSlot(slotId: SlotId): Promise<void> {
  const db = await getDb()
  await db.delete('saves', slotId)
}

export async function getMetadata(slotId: SlotId): Promise<SaveMetadata | null> {
  const db = await getDb()
  const record = await db.get('saves', slotId)
  return record?.metadata ?? null
}
