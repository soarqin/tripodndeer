import { useEffect } from 'react'
import { useGameStore } from '~/ui/store/game-store'

export function useCodexHotkey(): void {
  const activePanel = useGameStore((state) => state.activePanel)
  const openCodex = useGameStore((state) => state.openCodex)
  const closeCodex = useGameStore((state) => state.closeCodex)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && (
          target.isContentEditable ||
          target.contentEditable === 'true' ||
          target.getAttribute('contenteditable') === 'true' ||
          target.getAttribute('contenteditable') === ''
        ))
      ) {
        return
      }

      if (e.shiftKey && e.key === '?') {
        if (activePanel === 'codex') {
          closeCodex()
        } else {
          openCodex()
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activePanel, closeCodex, openCodex])
}
