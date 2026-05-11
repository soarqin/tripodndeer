import React from 'react'
import type { OpenModalPayload } from '@/ui/store/slices/ui-slice'
import { ModalPriority } from '@/ui/store/slices/ui-slice'
import type { ModalAction } from '@/ui/components/Modal'
import styles from './TutorialCompleteModal.module.css'

export function TutorialCompleteModalContent() {
  return (
    <div className={styles.body}>
      恭喜完成秦灭巴蜀教学。5 步核心循环已全部走通。
    </div>
  )
}

export function buildTutorialCompletePayload(
  onEnterMain: () => void,
  onContinue: () => void,
): OpenModalPayload {
  const actions: ModalAction[] = [
    {
      id: 'continue',
      label: '继续探索',
      onClick: onContinue,
      testId: 'tutorial-complete-continue',
    },
    {
      id: 'enter-main',
      label: '进入主剧本',
      onClick: onEnterMain,
      primary: true,
      testId: 'tutorial-complete-enter-main',
    },
  ]

  return {
    title: '教学完成！',
    content: React.createElement(TutorialCompleteModalContent),
    actions,
    priority: ModalPriority.TUTORIAL_COMPLETE,
    dismissable: false,
    testId: 'tutorial-complete-modal',
  }
}
