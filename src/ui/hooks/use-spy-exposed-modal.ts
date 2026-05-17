import { useEffect } from 'react'
import { useGameStore, ModalPriority } from '@/ui/store/game-store'

const ACTION_NAMES: Record<string, string> = {
  reconnaissance: '刺探',
  rumor: '流言',
  discord: '离间',
  counter_intel: '反间',
}

export function useSpyExposedModal(): void {
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (state.events === prevState.events) return
      if (state.events.length === 0) return

      for (const event of state.events) {
        if (event.type !== 'spyExposedHighRisk') continue

        const payload = event.payload as { spyRealmId: string; targetRealmId: string; action: string }
        const isPlayerInvolved =
          payload.spyRealmId === state.playerRealmId || payload.targetRealmId === state.playerRealmId
        if (!isPlayerInvolved) continue

        const spyRealm = state.world.realms.get(payload.spyRealmId)
        const targetRealm = state.world.realms.get(payload.targetRealmId)
        const spyName = spyRealm?.displayName ?? payload.spyRealmId
        const targetName = targetRealm?.displayName ?? payload.targetRealmId
        const actionName = ACTION_NAMES[payload.action] ?? payload.action
        const isOurSpy = payload.spyRealmId === state.playerRealmId
        const content = isOurSpy
          ? `我方派往 ${targetName} 的间者在执行 ${actionName} 任务时暴露了！`
          : `我们在境内发现了来自 ${spyName} 的间者，其正在执行 ${actionName} 任务！`

        useGameStore.getState().openModal({
          title: '谍者暴露',
          content,
          priority: ModalPriority.EVENT_CHAIN,
          actions: [
            {
              id: 'close',
              label: '确认',
              primary: true,
              onClick: () => useGameStore.getState().closeModal(),
            },
          ],
        })
      }
    })
    return unsubscribe
  }, [])
}
