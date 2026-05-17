import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/ui/store'
import {
  MANUAL_SLOT_IDS,
  AUTO_SLOT_IDS,
  listSlots,
  type ManualSlotId,
  type SlotId,
} from '@/ui/store/persistence/slot-crud'
import { isPersisted } from '@/ui/store/persistence/persist-request'
import type { SaveMetadata } from '@/ui/store/persistence/db'
import { formatGameDate } from '@/engine/date/calendar'
import { SlotRow } from './SlotRow'
import { SaveLoadDialogs } from './SaveLoadDialogs'
import { useSaveLoadActions } from './use-save-load-actions'
import styles from './SaveLoadModal.module.css'

export interface SaveLoadModalProps {
  mode: 'save' | 'load'
}

const ALL_SLOTS: readonly SlotId[] = [...MANUAL_SLOT_IDS, ...AUTO_SLOT_IDS]

function emptySlotMap(): Record<SlotId, SaveMetadata | null> {
  return ALL_SLOTS.reduce((acc, id) => {
    acc[id] = null
    return acc
  }, {} as Record<SlotId, SaveMetadata | null>)
}

export function SaveLoadModal({ mode }: SaveLoadModalProps) {
  const [slots, setSlots] = useState<Record<SlotId, SaveMetadata | null>>(emptySlotMap)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSlot, setEditingSlot] = useState<ManualSlotId | null>(null)
  const [saveName, setSaveName] = useState('')
  const [persisted, setPersisted] = useState(false)

  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<ManualSlotId | null>(null)
  const [renamingSlot, setRenamingSlot] = useState<ManualSlotId | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [importFile, setImportFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const world = useGameStore((state) => state.world)
  const replaceWorldFromSave = useGameStore((state) => state.replaceWorldFromSave)
  const closeModal = useGameStore((state) => state.closeModal)
  const enqueueToast = useGameStore((state) => state.enqueueToast)

  const refreshSlots = async () => {
    try {
      const metadataList = await listSlots()
      const newSlots = emptySlotMap()
      for (const meta of metadataList) {
        if ((ALL_SLOTS as readonly string[]).includes(meta.slotId)) {
          newSlots[meta.slotId as SlotId] = meta
        }
      }
      setSlots(newSlots)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const actions = useSaveLoadActions({
    world,
    slots,
    setSlots,
    setError,
    refreshSlots,
    closeModal,
    replaceWorldFromSave,
    enqueueToast,
  })

  useEffect(() => {
    isPersisted().then(setPersisted).catch(() => setPersisted(false))
    refreshSlots().finally(() => setLoading(false))
  }, [])

  const handleSlotClick = async (slotId: SlotId) => {
    if (renamingSlot === slotId) return
    setError(null)

    if (mode === 'save') {
      if (actions.isAutoSlot(slotId)) return
      const manualSlotId = slotId as ManualSlotId
      const existing = slots[manualSlotId]
      if (existing && !window.confirm('确定要覆盖此存档吗？')) return
      setEditingSlot(manualSlotId)
      setSaveName(existing?.name || `存档 ${formatGameDate(world.date)}`)
      return
    }

    if (!slots[slotId]) return
    try {
      await actions.performLoad(slotId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleSaveConfirm = async () => {
    if (!editingSlot) return
    try {
      await actions.performSave(editingSlot, saveName)
      setEditingSlot(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, slotId: ManualSlotId) => {
    e.stopPropagation()
    setConfirmDeleteSlot(slotId)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteSlot) return
    try {
      await actions.performDelete(confirmDeleteSlot)
      setConfirmDeleteSlot(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleRenameStart = (e: React.MouseEvent, slotId: ManualSlotId, currentName: string) => {
    e.stopPropagation()
    setRenamingSlot(slotId)
    setRenameValue(currentName)
  }

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!renamingSlot) return

    const trimmed = renameValue.trim()
    if (!trimmed) {
      setError('存档名称不能为空')
      return
    }

    try {
      await actions.performRename(renamingSlot, trimmed)
      setRenamingSlot(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleRenameCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingSlot(null)
    setError(null)
  }

  const handleExportClick = async (e: React.MouseEvent, slotId: SlotId) => {
    e.stopPropagation()
    await actions.performExport(slotId)
  }

  const handleImportTargetClick = async (targetSlotId: ManualSlotId) => {
    if (!importFile) return
    const file = importFile
    setImportFile(null)
    await actions.performImport(file, targetSlotId)
  }

  if (loading) return <div className={styles.container}>加载中...</div>

  const slotProps = {
    mode,
    renamingSlot,
    renameValue,
    onSlotClick: handleSlotClick,
    onRenameStart: handleRenameStart,
    onRenameSubmit: handleRenameSubmit,
    onRenameCancel: handleRenameCancel,
    onRenameValueChange: setRenameValue,
    onDeleteClick: handleDeleteClick,
    onExportClick: handleExportClick,
  }

  return (
    <div className={styles.container} data-testid="save-load-modal">
      {error && (
        <div className={styles.error} data-testid="save-load-error">
          {error}
        </div>
      )}
      <div className={styles.persistStatus} data-testid="persist-status">
        持久化存储：{persisted ? '已启用' : '未启用'}
      </div>

      <div className={styles.topActions}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          data-testid="import-save-btn"
          className={styles.iconButton}
        >
          导入存档
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) setImportFile(file)
          }}
          data-testid="import-file-input"
          style={{ display: 'none' }}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>手书史册</h3>
        <div className={styles.slots}>
          {MANUAL_SLOT_IDS.map((id) => (
            <SlotRow key={id} slotId={id} meta={slots[id]} isManual={true} {...slotProps} />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>天道流转</h3>
        <div className={styles.slots}>
          {AUTO_SLOT_IDS.map((id) => (
            <SlotRow key={id} slotId={id} meta={slots[id]} isManual={false} {...slotProps} />
          ))}
        </div>
      </div>

      <SaveLoadDialogs
        slots={slots}
        editingSlot={editingSlot}
        saveName={saveName}
        onSaveNameChange={setSaveName}
        onSaveCancel={() => setEditingSlot(null)}
        onSaveConfirm={handleSaveConfirm}
        confirmDeleteSlot={confirmDeleteSlot}
        onDeleteCancel={() => setConfirmDeleteSlot(null)}
        onDeleteConfirm={handleDeleteConfirm}
        importFile={importFile}
        onImportPick={handleImportTargetClick}
        onImportCancel={() => setImportFile(null)}
      />
    </div>
  )
}
