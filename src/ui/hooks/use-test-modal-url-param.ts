import { useEffect } from 'react'
import { useGameStore } from '@/ui/store/game-store'

export function useTestModalUrlParam(): void {
  const openModal = useGameStore((state) => state.openModal)
  const closeModal = useGameStore((state) => state.closeModal)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('test-modal') !== 'basic') return

    openModal({
      title: 'Test Modal',
      content: 'This is a test modal triggered by URL param.',
      actions: [
        {
          id: 'confirm',
          label: 'Confirm',
          primary: true,
          onClick: () => closeModal(),
        },
      ],
    })
  }, [openModal, closeModal])
}
