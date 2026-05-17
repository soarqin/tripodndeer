import { compressWorld, decompressWorld, isCompressed } from './compression'
import { getDb, type SaveMetadata } from './db'
import { SaveDTOSchema } from '~/shared/schemas/save-dto'
import { SAVE_DTO_VERSION, type Result, type SaveDTO, type SaveLoadError } from '~/shared/types/save-dto'

export const SLOT_IDS = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'auto'] as const
export type SlotId = (typeof SLOT_IDS)[number]

export interface SaveSlot {
  slotId: SlotId
  dto: SaveDTO
  metadata: SaveMetadata
}

interface StoredSaveDTO {
  schemaVersion: number
  scenarioId: string
  scenarioVersion: string
  createdAt: number
  tutorialState: unknown
  seenHints?: unknown
  hintsEnabled?: unknown
  world: string
}

interface StoredSaveRecord {
  slotId: string
  dto: StoredSaveDTO
  metadata: SaveMetadata
}

function readSchemaVersion(value: unknown): number | null {
  if (typeof value !== 'object' || value === null || !('schemaVersion' in value)) return null
  const schemaVersion = (value as { schemaVersion: unknown }).schemaVersion
  return typeof schemaVersion === 'number' ? schemaVersion : null
}

function readStoredWorld(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('world' in value)) return null
  const world = (value as { world: unknown }).world
  return typeof world === 'string' ? world : null
}

export async function saveSlot(slotId: SlotId, dto: SaveDTO, metadata: SaveMetadata): Promise<void> {
  SaveDTOSchema.parse(dto)

  const worldStr = JSON.stringify(dto.world)
  const compressedWorld = compressWorld(worldStr)

  const stored: StoredSaveDTO = {
    schemaVersion: dto.schemaVersion,
    scenarioId: dto.scenarioId,
    scenarioVersion: dto.scenarioVersion,
    createdAt: dto.createdAt,
    tutorialState: dto.tutorialState,
    seenHints: dto.seenHints,
    hintsEnabled: dto.hintsEnabled,
    world: compressedWorld,
  }
  const record: StoredSaveRecord = { slotId, dto: stored, metadata }

  const db = await getDb()
  await db.put('saves', record)
}

export async function loadSlot(slotId: SlotId): Promise<Result<SaveSlot, SaveLoadError>> {
  const db = await getDb()
  const record = await db.get('saves', slotId)
  if (!record) {
    return { ok: false, error: { kind: 'missing_data', message: `Slot ${slotId} is empty` } }
  }

  const schemaVersion = readSchemaVersion(record.dto)
  if (schemaVersion === null || schemaVersion !== SAVE_DTO_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'incompatible_version',
        message: 'Incompatible save version',
        got: schemaVersion ?? -1,
        expected: SAVE_DTO_VERSION,
      },
    }
  }

  const storedWorld = readStoredWorld(record.dto)
  if (storedWorld === null) {
    return { ok: false, error: { kind: 'parse_error', message: 'Stored world field is missing or not a string' } }
  }

  let worldStr: string
  try {
    worldStr = isCompressed(storedWorld) ? decompressWorld(storedWorld) : storedWorld
  } catch {
    return { ok: false, error: { kind: 'parse_error', message: 'Failed to decompress world data' } }
  }

  let worldObj: unknown
  try {
    worldObj = JSON.parse(worldStr)
  } catch {
    return { ok: false, error: { kind: 'parse_error', message: 'Failed to parse world JSON' } }
  }

  const logicalDto = { ...(record.dto as StoredSaveDTO), world: worldObj }
  const parsed = SaveDTOSchema.safeParse(logicalDto)
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
