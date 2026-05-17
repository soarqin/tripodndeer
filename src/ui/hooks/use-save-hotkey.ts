import { useEffect } from 'react'
import { saveDtoToHintState, saveDtoToWorld } from '@/engine/world/save-dto'
import { useGameStore } from '@/ui/store'
import { listSlots, loadSlot, type AutoSlotId } from '@/ui/store/persistence/slot-crud'
import type { SaveMetadata } from '@/ui/store/persistence/db'

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && (
      target.isContentEditable ||
      target.contentEditable === 'true' ||
      target.getAttribute('contenteditable') === 'true' ||
      target.getAttribute('contenteditable') === ''
    ))
  )
}

async function quickLoadLatestAutoSlot(slotId: AutoSlotId): Promise<void> {
  const loadResult = await loadSlot(slotId)
  if (!loadResult.ok) {
    useGameStore.getState().enqueueToast(loadResult.error.message, 3000)
    return
  }

  const worldResult = saveDtoToWorld(loadResult.value.dto)
  if (!worldResult.ok) {
    useGameStore.getState().enqueueToast(worldResult.error.message, 3000)
    return
  }

  useGameStore.getState().replaceWorldFromSave(worldResult.value)
  useGameStore.setState(saveDtoToHintState(loadResult.value.dto))
}

export function useSaveHotkey(): void {
  const openModal = useGameStore((state) => state.openModal)
  const closeModal = useGameStore((state) => state.closeModal)

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key !== 'F9') return
      if (isTypingTarget(e.target)) return

      e.preventDefault()

      const slots = await listSlots()
      const autoSlots = slots.filter((slot): slot is SaveMetadata & { slotId: AutoSlotId } => slot.slotId.startsWith('auto_'))
      if (autoSlots.length === 0) {
        useGameStore.getState().enqueueToast('暂无自动存档', 3000)
        return
      }

      const latest = autoSlots.reduce((current, candidate) => (
        candidate.createdAt > current.createdAt ? candidate : current
      ))
      const saveTime = new Date(latest.createdAt).toLocaleString()

      openModal({
        title: '逆转天命',
        content: `天命将逆转至 ${saveTime}，当前未记录的岁月将永远消逝。是否继续？`,
        actions: [
          {
            id: 'confirm-quick-load',
            label: '继续',
            primary: true,
            onClick: async () => {
              closeModal()
              await quickLoadLatestAutoSlot(latest.slotId)
            },
          },
          {
            id: 'cancel-quick-load',
            label: '取消',
            onClick: () => closeModal(),
          },
        ],
        dismissable: true,
      })
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeModal, openModal])
}
