import { useEffect, useState } from 'react'
import { useGameStore } from '@/ui/store'
import { listSlots, saveSlot, loadSlot, type SlotId } from '@/ui/store/persistence/slot-crud'
import { isPersisted, requestPersistentStorage } from '@/ui/store/persistence/persist-request'
import type { SaveMetadata } from '@/ui/store/persistence/db'
import { worldToSaveDTO, saveDtoToWorld, saveDtoToHintState } from '@/engine/world/save-dto'
import { formatGameDate } from '@/engine/date/calendar'
import styles from './SaveLoadModal.module.css'

export interface SaveLoadModalProps {
  mode: 'save' | 'load'
}

const SLOTS: SlotId[] = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'auto']

export function SaveLoadModal({ mode }: SaveLoadModalProps) {
  const [slots, setSlots] = useState<Record<SlotId, SaveMetadata | null>>({
    slot1: null, slot2: null, slot3: null, slot4: null, slot5: null, auto: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSlot, setEditingSlot] = useState<SlotId | null>(null)
  const [saveName, setSaveName] = useState('')
  const [persisted, setPersisted] = useState(false)

  const world = useGameStore(state => state.world)
  const replaceWorldFromSave = useGameStore(state => state.replaceWorldFromSave)
  const closeModal = useGameStore(state => state.closeModal)

  useEffect(() => {
    isPersisted().then(setPersisted).catch(() => setPersisted(false))

    listSlots().then(metadataList => {
      const newSlots: Record<SlotId, SaveMetadata | null> = {
        slot1: null, slot2: null, slot3: null, slot4: null, slot5: null, auto: null
      }
      for (const meta of metadataList) {
        if (SLOTS.includes(meta.slotId as SlotId)) {
          newSlots[meta.slotId as SlotId] = meta
        }
      }
      setSlots(newSlots)
      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [])

  const handleSlotClick = async (slotId: SlotId) => {
    setError(null)
    
    if (mode === 'save') {
      if (slotId === 'auto') return
      
      const existing = slots[slotId]
      if (existing) {
        if (!window.confirm('确定要覆盖此存档吗？')) return
      }
      
      setEditingSlot(slotId)
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
        playerRealmName: playerRealm ? playerRealm.displayName : '未知势力'
      }
      
      const result = await saveSlot(editingSlot, dto, metadata)
      if (!result.ok) {
        if (result.error.kind !== 'quota_exceeded') {
          setError(result.error.message)
        }
        return
      }
      void requestPersistentStorage().catch(() => {})

      setSlots(prev => ({ ...prev, [editingSlot]: metadata }))
      setEditingSlot(null)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (loading) return <div className={styles.container}>加载中...</div>

  return (
    <div className={styles.container} data-testid="save-load-modal">
      {error && <div className={styles.error} data-testid="save-load-error">{error}</div>}
      <div className={styles.persistStatus} data-testid="persist-status">
        持久化存储：{persisted ? '已启用' : '未启用'}
      </div>
      
      <div className={styles.slots}>
        {SLOTS.map(slotId => {
          const meta = slots[slotId]
          const isAuto = slotId === 'auto'
          const disabled = (mode === 'save' && isAuto) || (mode === 'load' && !meta)
          
          return (
            <div 
              key={slotId}
              className={`${styles.slot} ${disabled ? styles.disabled : ''}`}
              data-testid={`slot-${slotId}`}
              onClick={() => !disabled && handleSlotClick(slotId)}
            >
              <div className={styles.slotHeader}>
                <span className={styles.slotId}>{isAuto ? '自动存档' : `存档 ${slotId.replace('slot', '')}`}</span>
                {meta && <span className={styles.slotDate}>{new Date(meta.createdAt).toLocaleString()}</span>}
              </div>
              
              {meta ? (
                <div className={styles.slotMeta} data-testid={`slot-${slotId}-meta`}>
                  <div className={styles.slotName}>{meta.name}</div>
                  <div className={styles.slotDetails}>
                    {meta.playerRealmName} | 第 {meta.tick} 旬 | {meta.scenarioId === 'm9' ? '战国' : '春秋'}
                  </div>
                </div>
              ) : (
                <div className={styles.emptySlot}>空存档位</div>
              )}
            </div>
          )
        })}
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
    </div>
  )
}
