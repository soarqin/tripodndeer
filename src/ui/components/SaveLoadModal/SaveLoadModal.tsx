import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/ui/store'
import { MANUAL_SLOT_IDS, AUTO_SLOT_IDS, listSlots, saveSlot, loadSlot, deleteSlot, renameSlot, updateSlotThumbnail, type ManualSlotId, type AutoSlotId, type SlotId } from '@/ui/store/persistence/slot-crud'
import { isPersisted, requestPersistentStorage } from '@/ui/store/persistence/persist-request'
import type { SaveMetadata } from '@/ui/store/persistence/db'
import { worldToSaveDTO, saveDtoToWorld, saveDtoToHintState } from '@/engine/world/save-dto'
import { generateSummary } from '@/engine/world/save-summary'
import { formatGameDate } from '@/engine/date/calendar'
import { Modal } from '@/ui/components/Modal/Modal'
import { generateThumbnail } from '@/rendering/map/save-thumbnail'
import { exportSlot, importSave } from './export-import'
import type { SaveLoadError } from '@/shared/types/save-dto'
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

function toastMessageForError(error: SaveLoadError): string {
  switch (error.kind) {
    case 'incompatible_version':
      return `存档版本不兼容 (需要 v${error.expected}, 实际 v${error.got})`
    case 'parse_error':
      if (error.message === 'invalid JSON') return '导入失败：invalid JSON'
      if (error.message === 'missing scenarioVersion' || error.message === 'invalid structure') {
        return '存档结构异常'
      }
      return `导入失败：${error.message}`
    case 'corrupted':
      return '存档已损坏，已隔离'
    case 'missing_data':
      return '存档不存在'
    case 'quota_exceeded':
      return '存储空间已满'
    case 'newer_version':
      return `存档版本过新 (需要 v${error.expected}, 实际 v${error.got})`
  }
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

  const world = useGameStore(state => state.world)
  const replaceWorldFromSave = useGameStore(state => state.replaceWorldFromSave)
  const closeModal = useGameStore(state => state.closeModal)
  const enqueueToast = useGameStore(state => state.enqueueToast)

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

  useEffect(() => {
    isPersisted().then(setPersisted).catch(() => setPersisted(false))

    refreshSlots().finally(() => setLoading(false))
  }, [])

  const handleSlotClick = async (slotId: SlotId) => {
    if (renamingSlot === slotId) return // Don't trigger load/save while renaming
    setError(null)

    if (mode === 'save') {
      if ((AUTO_SLOT_IDS as readonly string[]).includes(slotId)) return // Cannot save to auto slots manually
      
      const manualSlotId = slotId as ManualSlotId
      const existing = slots[manualSlotId]
      if (existing) {
        if (!window.confirm('确定要覆盖此存档吗？')) return
      }

      setEditingSlot(manualSlotId)
      setSaveName(existing?.name || `存档 ${formatGameDate(world.date)}`)
    } else {
      const existing = slots[slotId]
      if (!existing) return
      
      try {
        const result = await loadSlot(slotId)
        if (!result.ok) {
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
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }
  }

  const handleSaveConfirm = async () => {
    if (!editingSlot) return
    
    try {
      const scenarioId = world.scenarioId
      const hintState = useGameStore.getState()
      const dto = worldToSaveDTO(world, scenarioId, {
        seenHints: hintState.seenHints,
        hintsEnabled: hintState.hintsEnabled,
      })
      const playerRealm = world.realms.get(world.playerRealmId)
      const metadata: SaveMetadata = {
        slotId: editingSlot,
        name: saveName || '未命名存档',
        createdAt: Date.now(),
        tick: world.tick,
        scenarioId,
        playerRealmName: playerRealm ? playerRealm.displayName : '未知势力',
        summary: generateSummary(world, scenarioId)
      }
      
      const result = await saveSlot(editingSlot, dto, metadata)
      if (!result.ok) {
        if (result.error.kind !== 'quota_exceeded') {
          setError(result.error.message)
        }
        return
      }
      void requestPersistentStorage().catch(() => {})

      const savedSlotId = editingSlot
      generateThumbnail(world).then(thumbnail => {
        updateSlotThumbnail(savedSlotId, thumbnail).then(() => {
          setSlots(prev => {
            const existing = prev[savedSlotId]
            if (!existing) return prev
            return { ...prev, [savedSlotId]: { ...existing, thumbnail } }
          })
        }).catch(console.error)
      }).catch(console.error)

      setSlots(prev => ({ ...prev, [editingSlot]: metadata }))
      setEditingSlot(null)
      closeModal()
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
      await deleteSlot(confirmDeleteSlot)
      await refreshSlots()
      setConfirmDeleteSlot(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleRenameClick = (e: React.MouseEvent, slotId: ManualSlotId, currentName: string) => {
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
      await renameSlot(renamingSlot, trimmed)
      await refreshSlots()
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
    const result = await exportSlot(slotId)
    if (!result.ok) {
      enqueueToast(toastMessageForError(result.error))
    }
  }

  const handleImportButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportFile(file)
  }

  const handleImportTargetClick = async (targetSlotId: ManualSlotId) => {
    if (!importFile) return
    const file = importFile
    setImportFile(null)
    const result = await importSave(file, targetSlotId)
    if (!result.ok) {
      enqueueToast(toastMessageForError(result.error))
      return
    }
    await refreshSlots()
    enqueueToast(`存档已导入至「${targetSlotId.replace('slot', '存档 ')}」`)
  }

  const handleImportCancel = () => {
    setImportFile(null)
  }

  if (loading) return <div className={styles.container}>加载中...</div>

  const renderSlot = (slotId: SlotId, isManual: boolean) => {
    const meta = slots[slotId]
    const disabled = (mode === 'load' && !meta) || (mode === 'save' && !isManual)

    return (
      <div
        key={slotId}
        className={`${styles.slot} ${disabled ? styles.disabled : ''}`}
        data-testid={`slot-${slotId}`}
        onClick={() => !disabled && handleSlotClick(slotId)}
      >
        <div className={styles.slotHeader}>
          <span className={styles.slotId}>
            {isManual ? `存档 ${slotId.replace('slot', '')}` : `自动存档 ${slotId.replace('auto_', '')}`}
          </span>
          {meta && <span className={styles.slotDate}>{new Date(meta.createdAt).toLocaleString()}</span>}
        </div>
        
        {meta ? (
          <div className={styles.slotMeta} data-testid={`slot-${slotId}-meta`}>
            {meta.thumbnail && (
              <img src={meta.thumbnail} alt="Save thumbnail" className={styles.slotThumbnail} />
            )}
            {renamingSlot === slotId ? (
              <form className={styles.renameForm} onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  autoFocus
                  data-testid={`rename-input-${slotId}`}
                  className={styles.renameInput}
                />
                <button type="submit" data-testid={`rename-submit-${slotId}`} className={styles.iconButton}>✓</button>
                <button type="button" onClick={handleRenameCancel} data-testid={`rename-cancel-${slotId}`} className={styles.iconButton}>✕</button>
              </form>
            ) : (
              <div className={styles.slotNameRow}>
                <div className={styles.slotName}>{meta.name}</div>
                <div className={styles.slotActions}>
                  <button
                    className={styles.iconButton}
                    onClick={(e) => handleExportClick(e, slotId)}
                    data-testid={`export-btn-${slotId}`}
                    title="导出 JSON"
                  >
                    导出
                  </button>
                  {isManual && (
                    <>
                      <button
                        className={styles.iconButton}
                        onClick={(e) => handleRenameClick(e, slotId as ManualSlotId, meta.name)}
                        data-testid={`rename-btn-${slotId}`}
                        title="重命名"
                      >
                        ✏
                      </button>
                      <button
                        className={styles.iconButton}
                        onClick={(e) => handleDeleteClick(e, slotId as ManualSlotId)}
                        data-testid={`delete-btn-${slotId}`}
                        title="删除"
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className={styles.slotDetails}>
              {meta.playerRealmName} | 第 {meta.tick} 旬 | {meta.scenarioId === 'm9' ? '战国' : '春秋'}
            </div>
          </div>
        ) : (
          <div className={styles.emptySlot}>空存档位</div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container} data-testid="save-load-modal">
      {error && <div className={styles.error} data-testid="save-load-error">{error}</div>}
      <div className={styles.persistStatus} data-testid="persist-status">
        持久化存储：{persisted ? '已启用' : '未启用'}
      </div>

      <div className={styles.topActions}>
        <button
          type="button"
          onClick={handleImportButtonClick}
          data-testid="import-save-btn"
          className={styles.iconButton}
        >
          导入存档
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          data-testid="import-file-input"
          style={{ display: 'none' }}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>手书史册</h3>
        <div className={styles.slots}>
          {MANUAL_SLOT_IDS.map(id => renderSlot(id, true))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>天道流转</h3>
        <div className={styles.slots}>
          {AUTO_SLOT_IDS.map(id => renderSlot(id, false))}
        </div>
      </div>

      {editingSlot && (
        <div className={styles.editOverlay}>
          <div className={styles.editDialog}>
            <h3>输入存档名称</h3>
            <input 
              type="text" 
              value={saveName} 
              onChange={e => setSaveName(e.target.value)}
              autoFocus
              data-testid="save-name-input"
            />
            <div className={styles.editActions}>
              <button onClick={() => setEditingSlot(null)}>取消</button>
              <button onClick={handleSaveConfirm} data-testid="save-confirm-btn">保存</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteSlot && (
        <Modal
          title="删除存档"
          content={`是否销毁此卷史册：${slots[confirmDeleteSlot]?.name}？此举不可逆转。`}
          actions={[
            { id: 'cancel', label: '取消', onClick: () => setConfirmDeleteSlot(null) },
            { id: 'confirm', label: '确认删除', onClick: handleDeleteConfirm, primary: true, testId: 'confirm-delete-btn' }
          ]}
          onClose={() => setConfirmDeleteSlot(null)}
          testId="delete-confirm-modal"
        />
      )}

      {importFile && (
        <div className={styles.editOverlay} data-testid="import-target-picker">
          <div className={styles.editDialog}>
            <h3>选择目标存档槽位</h3>
            <div className={styles.importTargetList}>
              {MANUAL_SLOT_IDS.map(id => (
                <button
                  key={id}
                  type="button"
                  className={styles.iconButton}
                  onClick={() => handleImportTargetClick(id)}
                  data-testid={`import-target-${id}`}
                >
                  {`存档 ${id.replace('slot', '')}${slots[id] ? `（覆盖：${slots[id]?.name}）` : '（空）'}`}
                </button>
              ))}
            </div>
            <div className={styles.editActions}>
              <button type="button" onClick={handleImportCancel} data-testid="import-cancel-btn">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
