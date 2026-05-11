import React from 'react'
import type { HintEntry } from './hint-types'
import type { OpenModalPayload } from '@/ui/store/slices/ui-slice'
import { ModalPriority } from '@/ui/store/slices/ui-slice'
import { HintModalContent } from './HintModalContent'

export function buildHintModalPayload(
  entry: HintEntry,
  onConfirm: () => void,
  onDismiss: () => void,
): OpenModalPayload {
  return {
    title: entry.title,
    content: React.createElement(HintModalContent, { body: entry.body }),
    actions: [
      {
        id: 'dismiss',
        label: '知道了',
        onClick: onDismiss,
        testId: `hint-modal-${entry.id}-dismiss`,
      },
      {
        id: 'confirm',
        label: '查看详情',
        onClick: onConfirm,
        primary: true,
        testId: `hint-modal-${entry.id}-confirm`,
      },
    ],
    priority: ModalPriority.HINT_FIRST_ENCOUNTER,
    dismissable: true,
    testId: `hint-modal-${entry.id}`,
  }
}
