import { useEffect } from 'react'
import { worldToSaveDTO } from '~/engine/world/save-dto'
import { writeAutoRingBuffer } from '~/ui/store/persistence/auto-ring-buffer'
import { useGameStore } from '~/ui/store/game-store'

export function usePageHideSave(): void {
  useEffect(() => {
    const handleSave = () => {
      const state = useGameStore.getState()
      if (state.bootStatus !== 'ready' || !state.world) return

      const dto = worldToSaveDTO(state.world, state.world.scenarioId, {
        seenHints: state.seenHints,
        hintsEnabled: state.hintsEnabled,
      })
      const playerRealm = state.world.realms.get(state.world.playerRealmId)

      void writeAutoRingBuffer(dto, {
        slotId: 'auto_0',
        name: '退出时自动存档',
        createdAt: Date.now(),
        tick: state.world.tick,
        scenarioId: state.world.scenarioId,
        playerRealmName: playerRealm?.displayName ?? '未知势力',
      }).catch(() => {})
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSave()
      }
    }

    window.addEventListener('pagehide', handleSave)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', handleSave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
