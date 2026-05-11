import React from 'react'
import type { TutorialHintEntry } from '~/shared'
import type { OpenModalPayload } from '@/ui/store/slices/ui-slice'
import { ModalPriority } from '@/ui/store/slices/ui-slice'
import type { ModalAction } from '@/ui/components/Modal'
import { HintModalContent } from './HintModalContent'

export function buildTutorialHintPayload(
  hint: TutorialHintEntry,
  onConfirm: () => void,
  onDismiss: () => void,
): OpenModalPayload {
  const actions: ModalAction[] = [
    {
      id: 'dismiss',
      label: '知道了',
      onClick: onDismiss,
      testId: `tutorial-hint-modal-${hint.stepId}-dismiss`,
    },
  ]

  if (hint.codexEntryId) {
    actions.push({
      id: 'confirm',
      label: '查看详情',
      onClick: onConfirm,
      primary: true,
      testId: `tutorial-hint-modal-${hint.stepId}-confirm`,
    })
  }

  return {
    title: hint.titleZH,
    content: React.createElement(HintModalContent, { body: hint.bodyZH }),
    actions,
    priority: ModalPriority.TUTORIAL_STEP,
    dismissable: true,
    testId: `tutorial-hint-modal-${hint.stepId}`,
  }
}
