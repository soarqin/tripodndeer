import type { SaveMetadata } from '@/ui/store/persistence/db'
import type { ManualSlotId, SlotId } from '@/ui/store/persistence/slot-crud'
import { Modal } from '@/ui/components/Modal/Modal'
import { SaveNameDialog } from './SaveNameDialog'
import { ImportTargetPicker } from './ImportTargetPicker'

export interface SaveLoadDialogsProps {
  readonly slots: Record<SlotId, SaveMetadata | null>
  readonly editingSlot: ManualSlotId | null
  readonly saveName: string
  readonly onSaveNameChange: (next: string) => void
  readonly onSaveCancel: () => void
  readonly onSaveConfirm: () => void

  readonly confirmDeleteSlot: ManualSlotId | null
  readonly onDeleteCancel: () => void
  readonly onDeleteConfirm: () => void

  readonly importFile: File | null
  readonly onImportPick: (slotId: ManualSlotId) => void
  readonly onImportCancel: () => void
}

export function SaveLoadDialogs(props: SaveLoadDialogsProps) {
  const {
    slots,
    editingSlot,
    saveName,
    onSaveNameChange,
    onSaveCancel,
    onSaveConfirm,
    confirmDeleteSlot,
    onDeleteCancel,
    onDeleteConfirm,
    importFile,
    onImportPick,
    onImportCancel,
  } = props

  return (
    <>
      {editingSlot && (
        <SaveNameDialog
          value={saveName}
          onChange={onSaveNameChange}
          onCancel={onSaveCancel}
          onConfirm={onSaveConfirm}
        />
      )}

      {confirmDeleteSlot && (
        <Modal
          title="删除存档"
          content={`是否销毁此卷史册：${slots[confirmDeleteSlot]?.name}？此举不可逆转。`}
          actions={[
            { id: 'cancel', label: '取消', onClick: onDeleteCancel },
            {
              id: 'confirm',
              label: '确认删除',
              onClick: onDeleteConfirm,
              primary: true,
              testId: 'confirm-delete-btn',
            },
          ]}
          onClose={onDeleteCancel}
          testId="delete-confirm-modal"
        />
      )}

      {importFile && (
        <ImportTargetPicker slots={slots} onPick={onImportPick} onCancel={onImportCancel} />
      )}
    </>
  )
}
