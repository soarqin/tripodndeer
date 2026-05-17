import type { SaveMetadata } from '@/ui/store/persistence/db'
import type { ManualSlotId, SlotId } from '@/ui/store/persistence/slot-crud'
import styles from './SaveLoadModal.module.css'

export interface SlotRowProps {
  readonly slotId: SlotId
  readonly meta: SaveMetadata | null
  readonly isManual: boolean
  readonly mode: 'save' | 'load'
  readonly renamingSlot: ManualSlotId | null
  readonly renameValue: string
  readonly onSlotClick: (slotId: SlotId) => void
  readonly onRenameStart: (e: React.MouseEvent, slotId: ManualSlotId, currentName: string) => void
  readonly onRenameSubmit: (e?: React.FormEvent) => void
  readonly onRenameCancel: (e: React.MouseEvent) => void
  readonly onRenameValueChange: (value: string) => void
  readonly onDeleteClick: (e: React.MouseEvent, slotId: ManualSlotId) => void
  readonly onExportClick: (e: React.MouseEvent, slotId: SlotId) => void
}

export function SlotRow(props: SlotRowProps) {
  const { slotId, meta, isManual, mode, renamingSlot, renameValue } = props
  const disabled = (mode === 'load' && !meta) || (mode === 'save' && !isManual)
  const isRenaming = renamingSlot === slotId

  return (
    <div
      key={slotId}
      className={`${styles.slot} ${disabled ? styles.disabled : ''}`}
      data-testid={`slot-${slotId}`}
      onClick={() => !disabled && props.onSlotClick(slotId)}
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
          {isRenaming ? (
            <form
              className={styles.renameForm}
              onSubmit={props.onRenameSubmit}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={renameValue}
                onChange={(e) => props.onRenameValueChange(e.target.value)}
                autoFocus
                data-testid={`rename-input-${slotId}`}
                className={styles.renameInput}
              />
              <button
                type="submit"
                data-testid={`rename-submit-${slotId}`}
                className={styles.iconButton}
              >
                ✓
              </button>
              <button
                type="button"
                onClick={props.onRenameCancel}
                data-testid={`rename-cancel-${slotId}`}
                className={styles.iconButton}
              >
                ✕
              </button>
            </form>
          ) : (
            <div className={styles.slotNameRow}>
              <div className={styles.slotName}>{meta.name}</div>
              <div className={styles.slotActions}>
                <button
                  className={styles.iconButton}
                  onClick={(e) => props.onExportClick(e, slotId)}
                  data-testid={`export-btn-${slotId}`}
                  title="导出 JSON"
                >
                  导出
                </button>
                {isManual && (
                  <>
                    <button
                      className={styles.iconButton}
                      onClick={(e) => props.onRenameStart(e, slotId as ManualSlotId, meta.name)}
                      data-testid={`rename-btn-${slotId}`}
                      title="重命名"
                    >
                      ✏
                    </button>
                    <button
                      className={styles.iconButton}
                      onClick={(e) => props.onDeleteClick(e, slotId as ManualSlotId)}
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
          {meta.summary && (
            <div className={styles.slotSummary} data-testid={`slot-${slotId}-summary`}>
              {meta.summary}
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
