import { useGameStore } from '@/ui/store'
import { ModalPriority } from '@/ui/store/slices/ui-slice'
import {
  AUTO_SLOT_IDS,
  saveSlot,
  loadSlot,
  deleteSlot,
  renameSlot,
  updateSlotThumbnail,
  type ManualSlotId,
  type SlotId,
} from '@/ui/store/persistence/slot-crud'
import { requestPersistentStorage } from '@/ui/store/persistence/persist-request'
import type { SaveMetadata } from '@/ui/store/persistence/db'
import { worldToSaveDTO, saveDtoToWorld, saveDtoToHintState } from '@/engine/world/save-dto'
import { generateSummary } from '@/engine/world/save-summary'
import { generateThumbnail } from '@/rendering/map/save-thumbnail'
import { exportSlot, importSave } from './export-import'
import { toastMessageForError } from './toast-mapping'
import type { World } from '~/shared/types'

function openCorruptedSaveModal() {
  useGameStore.getState().openModal({
    title: '存档损坏',
    content: '存档损坏，已隔离备份。',
    priority: ModalPriority.SUCCESSION_CRISIS,
    dismissable: true,
    testId: 'corrupted-save-modal',
    actions: [
      {
        id: 'ok',
        label: '知道了',
        primary: true,
        onClick: () => useGameStore.getState().closeModal(),
      },
    ],
  })
}

export interface SaveLoadDeps {
  readonly world: World
  readonly slots: Record<SlotId, SaveMetadata | null>
  readonly setSlots: React.Dispatch<React.SetStateAction<Record<SlotId, SaveMetadata | null>>>
  readonly setError: (next: string | null) => void
  readonly refreshSlots: () => Promise<void>
  readonly closeModal: () => void
  readonly replaceWorldFromSave: (world: World) => void
  readonly enqueueToast: (text: string, durationMs?: number) => void
}

export interface SaveLoadActions {
  readonly performLoad: (slotId: SlotId) => Promise<void>
  readonly performSave: (slotId: ManualSlotId, name: string) => Promise<void>
  readonly performDelete: (slotId: ManualSlotId) => Promise<void>
  readonly performRename: (slotId: ManualSlotId, trimmed: string) => Promise<void>
  readonly performExport: (slotId: SlotId) => Promise<void>
  readonly performImport: (file: File, targetSlotId: ManualSlotId) => Promise<void>
  readonly isAutoSlot: (slotId: SlotId) => boolean
}

export function useSaveLoadActions(deps: SaveLoadDeps): SaveLoadActions {
  const { setSlots, setError, refreshSlots, closeModal, replaceWorldFromSave, enqueueToast, world } = deps

  const performLoad = async (slotId: SlotId) => {
    const result = await loadSlot(slotId)
    if (!result.ok) {
      if (result.error.kind === 'corrupted') {
        openCorruptedSaveModal()
        await refreshSlots()
        return
      }
      if (result.error.kind === 'incompatible_version') {
        setError(`存档版本不兼容 (需要 ${result.error.expected}, 实际 ${result.error.got})`)
      } else {
        setError(result.error.message)
      }
      return
    }

    const worldResult = saveDtoToWorld(result.value.dto)
    if (!worldResult.ok) {
      setError(worldResult.error.message)
      return
    }

    replaceWorldFromSave(worldResult.value)
    const hintState = saveDtoToHintState(result.value.dto)
    useGameStore.setState({
      seenHints: hintState.seenHints,
      hintsEnabled: hintState.hintsEnabled,
    })
    closeModal()
  }

  const performSave = async (slotId: ManualSlotId, name: string) => {
    const scenarioId = world.scenarioId
    const hintState = useGameStore.getState()
    const dto = worldToSaveDTO(world, scenarioId, {
      seenHints: hintState.seenHints,
      hintsEnabled: hintState.hintsEnabled,
    })
    const playerRealm = world.realms.get(world.playerRealmId)
    const metadata: SaveMetadata = {
      slotId,
      name: name || '未命名存档',
      createdAt: Date.now(),
      tick: world.tick,
      scenarioId,
      playerRealmName: playerRealm ? playerRealm.displayName : '未知势力',
      summary: generateSummary(world, scenarioId),
    }

    const result = await saveSlot(slotId, dto, metadata)
    if (!result.ok) {
      if (result.error.kind !== 'quota_exceeded') setError(result.error.message)
      return
    }
    void requestPersistentStorage().catch(() => {})

    generateThumbnail(world)
      .then((thumbnail) =>
        updateSlotThumbnail(slotId, thumbnail).then(() => {
          setSlots((prev) => {
            const existing = prev[slotId]
            if (!existing) return prev
            return { ...prev, [slotId]: { ...existing, thumbnail } }
          })
        }),
      )
      .catch(console.error)

    setSlots((prev) => ({ ...prev, [slotId]: metadata }))
    closeModal()
  }

  const performDelete = async (slotId: ManualSlotId) => {
    await deleteSlot(slotId)
    await refreshSlots()
  }

  const performRename = async (slotId: ManualSlotId, trimmed: string) => {
    await renameSlot(slotId, trimmed)
    await refreshSlots()
  }

  const performExport = async (slotId: SlotId) => {
    const result = await exportSlot(slotId)
    if (!result.ok) enqueueToast(toastMessageForError(result.error))
  }

  const performImport = async (file: File, targetSlotId: ManualSlotId) => {
    const result = await importSave(file, targetSlotId)
    if (!result.ok) {
      enqueueToast(toastMessageForError(result.error))
      return
    }
    await refreshSlots()
    enqueueToast(`存档已导入至「${targetSlotId.replace('slot', '存档 ')}」`)
  }

  const isAutoSlot = (slotId: SlotId) => (AUTO_SLOT_IDS as readonly string[]).includes(slotId)

  return { performLoad, performSave, performDelete, performRename, performExport, performImport, isAutoSlot }
}
