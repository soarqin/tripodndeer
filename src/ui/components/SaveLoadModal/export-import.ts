import { SaveDTOSchema } from '~/shared/schemas/save-dto'
import {
  SAVE_DTO_VERSION,
  type Result,
  type SaveDTO,
  type SaveLoadError,
} from '~/shared/types/save-dto'
import {
  loadSlot,
  saveSlot,
  type ManualSlotId,
  type SlotId,
} from '@/ui/store/persistence/slot-crud'
import type { SaveMetadata } from '@/ui/store/persistence/db'

export async function exportSlot(slotId: SlotId): Promise<Result<void, SaveLoadError>> {
  const result = await loadSlot(slotId)
  if (!result.ok) return result

  const json = JSON.stringify(result.value.dto, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    const safeName = sanitizeFilename(result.value.metadata.name)
    a.download = `${safeName}_${Date.now()}.json`
    a.href = url
    a.click()
  } finally {
    URL.revokeObjectURL(url)
  }

  return { ok: true, value: undefined }
}

export async function importSave(
  file: File,
  targetSlotId: ManualSlotId,
): Promise<Result<void, SaveLoadError>> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: { kind: 'parse_error', message: 'invalid JSON' } }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: { kind: 'parse_error', message: 'invalid JSON' } }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: { kind: 'parse_error', message: 'invalid structure' } }
  }

  const rawSchemaVersion = (parsed as { schemaVersion?: unknown }).schemaVersion
  if (typeof rawSchemaVersion === 'number' && rawSchemaVersion !== SAVE_DTO_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'incompatible_version',
        message: 'Incompatible save version',
        got: rawSchemaVersion,
        expected: SAVE_DTO_VERSION,
      },
    }
  }

  const rawScenarioVersion = (parsed as { scenarioVersion?: unknown }).scenarioVersion
  if (typeof rawScenarioVersion !== 'string' || rawScenarioVersion.length === 0) {
    return { ok: false, error: { kind: 'parse_error', message: 'missing scenarioVersion' } }
  }

  const zodResult = SaveDTOSchema.safeParse(parsed)
  if (!zodResult.success) {
    return { ok: false, error: { kind: 'parse_error', message: zodResult.error.message } }
  }

  const dto = zodResult.data as unknown as SaveDTO

  const playerRealmName = extractPlayerRealmName(dto)
  const metadata: SaveMetadata = {
    slotId: targetSlotId,
    name: `导入存档 ${new Date().toLocaleString()}`,
    createdAt: Date.now(),
    tick: dto.world.tick,
    scenarioId: dto.scenarioId,
    playerRealmName,
  }

  return saveSlot(targetSlotId, dto, metadata)
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\u4e00-\u9fff]/g, '_') || 'save'
}

function extractPlayerRealmName(dto: SaveDTO): string {
  const entry = dto.world.realms.find(([id]) => id === dto.world.playerRealmId)
  if (!entry) return '未知势力'
  const realm = entry[1] as { displayName?: unknown }
  return typeof realm.displayName === 'string' ? realm.displayName : '未知势力'
}
