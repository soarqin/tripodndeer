import { MANUAL_SLOT_IDS, type ManualSlotId, type SlotId } from '@/ui/store/persistence/slot-crud'
import type { SaveMetadata } from '@/ui/store/persistence/db'
import styles from './SaveLoadModal.module.css'

export interface ImportTargetPickerProps {
  readonly slots: Record<SlotId, SaveMetadata | null>
  readonly onPick: (slotId: ManualSlotId) => void
  readonly onCancel: () => void
}

export function ImportTargetPicker({ slots, onPick, onCancel }: ImportTargetPickerProps) {
  return (
    <div className={styles.editOverlay} data-testid="import-target-picker">
      <div className={styles.editDialog}>
        <h3>选择目标存档槽位</h3>
        <div className={styles.importTargetList}>
          {MANUAL_SLOT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.iconButton}
              onClick={() => onPick(id)}
              data-testid={`import-target-${id}`}
            >
              {`存档 ${id.replace('slot', '')}${
                slots[id] ? `（覆盖：${slots[id]?.name}）` : '（空）'
              }`}
            </button>
          ))}
        </div>
        <div className={styles.editActions}>
          <button type="button" onClick={onCancel} data-testid="import-cancel-btn">
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
