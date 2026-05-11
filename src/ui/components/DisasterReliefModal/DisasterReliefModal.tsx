import { useEffect } from 'react'
import { useGameStore } from '~/ui/store/game-store'
import { loadDisasterDefinitions } from '~/engine/systems/disaster/disaster-phase'
import { useModalWithHint } from '@/ui/hooks/use-modal-with-hint'

export function DisasterReliefModal() {
  const world = useGameStore((state) => state.world)
  const applyDisasterChoice = useGameStore((state) => state.applyDisasterChoice)

  const playerRealmId = world.playerRealmId
  const playerDisaster = world.disasterStates.get(playerRealmId)
  const disasterDefs = loadDisasterDefinitions()
  const disasterDef = playerDisaster ? disasterDefs.find(d => d.id === playerDisaster.disasterId) : undefined
  const siteName = playerDisaster ? (world.sites.get(playerDisaster.siteId)?.name ?? '未知地点') : '未知地点'
  const triggerDisasterWithHint = useModalWithHint('hint_disaster', () => {
    return {
      title: `${siteName} 发生 ${disasterDef!.displayNameZh}`,
      content: `灾情紧急，请主公定夺。`,
      dismissable: false,
      testId: 'disaster-modal',
      actions: disasterDef!.playerChoices.map(choice => ({
        id: choice.id,
        label: choice.labelZh,
        title: choice.outcomeZh,
        testId: `disaster-action-${choice.id}`,
        onClick: () => applyDisasterChoice(disasterDef!.id, choice.id)
      }))
    }
  })

  useEffect(() => {
    if (playerDisaster?.status === 'awaiting_decision' && disasterDef) {
      triggerDisasterWithHint()
    }
  }, [playerDisaster, disasterDef, triggerDisasterWithHint])

  return null
}
