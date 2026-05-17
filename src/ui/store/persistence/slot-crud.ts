import { compressWorld, decompressWorld, isCompressed } from './compression'
import { getDb, type SaveMetadata } from './db'
import { quarantineSlot } from './quarantine'
import { SaveDTOSchema } from '~/shared/schemas/save-dto'
import { M11_QUOTA_BLOCK_THRESHOLD_PCT, M11_QUOTA_CACHE_TTL_MS, M11_QUOTA_PRIVATE_FALLBACK_MB, M11_QUOTA_WARN_THRESHOLD_PCT } from '~/content/m2/balance/m11'
import { ModalPriority, useGameStore } from '../game-store'
import { SAVE_DTO_VERSION, type Result, type SaveDTO, type SaveLoadError } from '~/shared/types/save-dto'

export const MANUAL_SLOT_IDS = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5'] as const
export const AUTO_SLOT_IDS = [
  'auto_0',
  'auto_1',
  'auto_2',
  'auto_3',
  'auto_4',
  'auto_5',
  'auto_6',
  'auto_7',
  'auto_8',
  'auto_9',
] as const
export const SLOT_IDS = [...MANUAL_SLOT_IDS, ...AUTO_SLOT_IDS] as const
export type SlotId = (typeof SLOT_IDS)[number]
export type ManualSlotId = (typeof MANUAL_SLOT_IDS)[number]
export type AutoSlotId = (typeof AUTO_SLOT_IDS)[number]

function isAutoSlotId(slotId: string): slotId is AutoSlotId {
  return (AUTO_SLOT_IDS as readonly string[]).includes(slotId)
}

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

interface QuotaSnapshot {
  usage: number
  quota: number
  timestamp: number
  estimateFn: StorageManager['estimate']
}

let quotaCache: QuotaSnapshot | null = null

export function resetQuotaCacheForTesting(): void {
  quotaCache = null
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

async function checkQuota(): Promise<{ usage: number; quota: number } | null> {
  const storage = globalThis.navigator?.storage
  if (!storage?.estimate) return null

  const now = Date.now()
  if (quotaCache && quotaCache.estimateFn === storage.estimate && now - quotaCache.timestamp < M11_QUOTA_CACHE_TTL_MS) {
    return { usage: quotaCache.usage, quota: quotaCache.quota }
  }

  try {
    const estimate = await storage.estimate()
    const usage = estimate.usage ?? 0
    const quota = estimate.quota ?? M11_QUOTA_PRIVATE_FALLBACK_MB * 1024 * 1024
    quotaCache = { usage, quota, timestamp: now, estimateFn: storage.estimate }
    return { usage, quota }
  } catch {
    return null
  }
}

function warnQuotaNearLimit(): void {
  useGameStore.getState().enqueueToast('存储空间不足，请删除旧存档', 5000)
}

function showQuotaExceededModal(): void {
  useGameStore.getState().openModal({
    title: '存储空间已满',
    content: '存储空间已满，无法保存。请删除旧存档后重试。',
    actions: [{ id: 'ok', label: '知道了', onClick: () => useGameStore.getState().closeModal(), primary: true }],
    dismissable: true,
    priority: ModalPriority.GENERIC,
    testId: 'quota-exceeded-modal',
  })
}

export async function saveSlot(slotId: SlotId, dto: SaveDTO, metadata: SaveMetadata): Promise<Result<void, SaveLoadError>> {
  SaveDTOSchema.parse(dto)

  const quotaInfo = await checkQuota()
  if (quotaInfo) {
    const pct = (quotaInfo.usage / quotaInfo.quota) * 100
    if (pct >= M11_QUOTA_BLOCK_THRESHOLD_PCT) {
      if (!isAutoSlotId(slotId)) {
        showQuotaExceededModal()
      }
      return { ok: false, error: { kind: 'quota_exceeded', message: '存储空间已满，无法保存' } }
    }
    if (pct >= M11_QUOTA_WARN_THRESHOLD_PCT) {
      warnQuotaNearLimit()
    }
  }

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
  try {
    await db.put('saves', record)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      if (!isAutoSlotId(slotId)) {
        showQuotaExceededModal()
      }
      return { ok: false, error: { kind: 'quota_exceeded', message: '存储空间已满' } }
    }
    throw err
  }

  return { ok: true, value: undefined }
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
    const quarantineId = await quarantineSlot(slotId)
    return {
      ok: false,
      error: {
        kind: 'corrupted',
        message: 'Failed to decompress world data',
        originalSlotId: slotId,
        quarantineSlotId: quarantineId,
      },
    }
  }

  let worldObj: unknown
  try {
    worldObj = JSON.parse(worldStr)
  } catch {
    const quarantineId = await quarantineSlot(slotId)
    return {
      ok: false,
      error: {
        kind: 'corrupted',
        message: 'Failed to parse world JSON',
        originalSlotId: slotId,
        quarantineSlotId: quarantineId,
      },
    }
  }

  const logicalDto = { ...(record.dto as StoredSaveDTO), world: worldObj }
  const parsed = SaveDTOSchema.safeParse(logicalDto)
  if (!parsed.success) {
    const quarantineId = await quarantineSlot(slotId)
    return {
      ok: false,
      error: {
        kind: 'corrupted',
        message: parsed.error.message,
        originalSlotId: slotId,
        quarantineSlotId: quarantineId,
      },
    }
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
