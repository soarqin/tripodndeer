import { useEffect } from 'react'
import { useGameStore, ModalPriority } from '~/ui/store'
import { getEventChain } from '~/engine/systems/events/event-chain-engine'
import styles from './EventChainModal.module.css'

export function EventChainModal() {
  const eventChainStates = useGameStore((state) => state.world.eventChainStates)
  const playerRealmId = useGameStore((state) => state.playerRealmId)
  const openModal = useGameStore((state) => state.openModal)
  const applyEventChainChoice = useGameStore((state) => state.applyEventChainChoice)
  const modalQueue = useGameStore((state) => state.modalQueue)

  useEffect(() => {
    let targetChainId: string | null = null
    let targetStageId: string | null = null

    for (const [chainId, state] of eventChainStates.entries()) {
      if (state.completed) continue

      const chain = getEventChain(chainId)
      if (!chain) continue

      if (chain.trigger.type === 'state' && chain.trigger.realmId !== playerRealmId) continue
      if (chain.trigger.type === 'date' && chain.trigger.realmId !== playerRealmId) continue

      const currentQueue = useGameStore.getState().modalQueue
      const isAlreadyQueued = currentQueue.some(
        (m) => m.priority === ModalPriority.EVENT_CHAIN && m.testId === `event-chain-modal-${chainId}`
      )

      if (!isAlreadyQueued) {
        targetChainId = chainId
        targetStageId = state.currentStageId
        break
      }
    }

    if (targetChainId && targetStageId) {
      const chain = getEventChain(targetChainId)
      if (!chain) return

      const stage = chain.stages.find((s) => s.id === targetStageId)
      if (!stage) return

      openModal({
        title: '历史事件',
        content: (
          <div className={styles.content}>
            <p>{stage.text}</p>
          </div>
        ),
        dismissable: false,
        priority: ModalPriority.EVENT_CHAIN,
        testId: `event-chain-modal-${targetChainId}`,
        actions: stage.choices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          testId: `event-chain-choice-${choice.id}`,
          onClick: () => applyEventChainChoice(targetChainId!, choice.id),
        })),
      })
    }
  }, [eventChainStates, playerRealmId, openModal, applyEventChainChoice, modalQueue])

  return null
}
