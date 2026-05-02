import React, { useEffect } from 'react'
import { useGameStore } from '~/ui/store'
import { selectActiveReformForPlayerRealm, selectPlayerActiveReform } from '~/ui/store/selectors'
import { ReformProgressView } from '~/ui/components/ReformProgressView/ReformProgressView'
import { ModalPriority } from '~/ui/store/game-store'

export function ReformPromptModal() {
  const activeReform = useGameStore(selectActiveReformForPlayerRealm)
  const reformState = useGameStore(selectPlayerActiveReform)
  const playerRealmId = useGameStore((state) => state.playerRealmId)
  const openModal = useGameStore((state) => state.openModal)
  const closeModal = useGameStore((state) => state.closeModal)
  const applyReformChoice = useGameStore((state) => state.applyReformChoice)
  const modalQueue = useGameStore((state) => state.modalQueue)

  const enqueuedStageRef = React.useRef<string | null>(null)

  useEffect(() => {
    if (!activeReform || !reformState) {
      enqueuedStageRef.current = null
      return
    }

    const stageId = activeReform.currentStage.id
    if (enqueuedStageRef.current === stageId) return

    const isAlreadyQueued = modalQueue.some(m => m.testId === 'reform-prompt-modal')
    if (!isAlreadyQueued) {
      enqueuedStageRef.current = stageId
      openModal({
          title: '变法抉择',
          content: (
            <ReformProgressView
              reform={activeReform.reform}
              state={reformState}
              onChoose={(choiceId) => {
                applyReformChoice(playerRealmId, activeReform.reform.id, choiceId)
                closeModal()
              }}
            />
          ),
          actions: [],
          dismissable: false,
          priority: ModalPriority.REFORM_PROMPT,
          testId: 'reform-prompt-modal'
        })
    }
  }, [activeReform, reformState, playerRealmId, openModal, closeModal, applyReformChoice, modalQueue])

  return null
}
