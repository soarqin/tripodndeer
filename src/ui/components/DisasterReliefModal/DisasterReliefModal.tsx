import { useEffect } from 'react'
import { useGameStore } from '~/ui/store/game-store'
import { loadDisasterDefinitions } from '~/engine/systems/disaster/disaster-phase'

export function DisasterReliefModal() {
  const world = useGameStore((state) => state.world)
  const applyDisasterChoice = useGameStore((state) => state.applyDisasterChoice)
  const openModal = useGameStore((state) => state.openModal)

  const playerRealmId = world.playerRealmId
  const playerDisaster = world.disasterStates.get(playerRealmId)

  useEffect(() => {
    if (playerDisaster?.status === 'awaiting_decision') {
      const defs = loadDisasterDefinitions()
      const def = defs.find(d => d.id === playerDisaster.disasterId)
      if (!def) return

      const site = world.sites.get(playerDisaster.siteId)
      const siteName = site?.name ?? '未知地点'

      openModal({
        title: `${siteName} 发生 ${def.displayNameZh}`,
        content: `灾情紧急，请主公定夺。`,
        dismissable: false,
        testId: 'disaster-modal',
        actions: def.playerChoices.map(choice => ({
          id: choice.id,
          label: choice.labelZh,
          title: choice.outcomeZh,
          testId: `disaster-action-${choice.id}`,
          onClick: () => applyDisasterChoice(def.id, choice.id)
        }))
      })
    }
  }, [playerDisaster, world.sites, openModal, applyDisasterChoice])

  return null
}
