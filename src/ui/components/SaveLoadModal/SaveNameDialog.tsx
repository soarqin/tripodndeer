import styles from './SaveLoadModal.module.css'

export interface SaveNameDialogProps {
  readonly value: string
  readonly onChange: (next: string) => void
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

export function SaveNameDialog({ value, onChange, onCancel, onConfirm }: SaveNameDialogProps) {
  return (
    <div className={styles.editOverlay}>
      <div className={styles.editDialog}>
        <h3>输入存档名称</h3>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          data-testid="save-name-input"
        />
        <div className={styles.editActions}>
          <button onClick={onCancel}>取消</button>
          <button onClick={onConfirm} data-testid="save-confirm-btn">
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
