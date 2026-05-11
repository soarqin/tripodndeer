import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '@/ui/store'
import type { OpenModalPayload } from '@/ui/store/slices/ui-slice'
import { ModalPriority } from '@/ui/store/slices/ui-slice'

beforeEach(() => {
  const store = useGameStore.getState()
  store.clearModalQueue()
  store.resetAllHints()
  store.setHintsEnabled(true)
  store.setActivePanel(null)
})

const mockOriginalPayload: OpenModalPayload = {
  title: 'Reform Modal',
  content: 'Reform content',
  actions: [{ id: 'ok', label: 'OK', onClick: vi.fn() }],
  priority: ModalPriority.REFORM_PROMPT,
  dismissable: false,
}

describe('useModalWithHint', () => {
  it('enqueues hint + original when first encounter in M9', () => {
    const store = useGameStore.getState()

    store.openModal({
      title: '变法',
      content: 'hint body',
      actions: [],
      priority: ModalPriority.HINT_FIRST_ENCOUNTER,
      dismissable: true,
      testId: 'hint-modal-hint_reform',
    })
    store.openModal(mockOriginalPayload)

    const queue = useGameStore.getState().modalQueue
    expect(queue.length).toBe(2)
    expect(queue[0]!.priority).toBe(ModalPriority.HINT_FIRST_ENCOUNTER)
    expect(queue[1]!.priority).toBe(ModalPriority.REFORM_PROMPT)
  })

  it('hint priority (120) is greater than reform priority (60)', () => {
    expect(ModalPriority.HINT_FIRST_ENCOUNTER).toBeGreaterThan(ModalPriority.REFORM_PROMPT)
  })

  it('markHintSeen + closeModal does not re-enqueue original', () => {
    const store = useGameStore.getState()
    store.openModal(mockOriginalPayload)

    const queueBefore = useGameStore.getState().modalQueue.length
    store.markHintSeen('hint_reform')
    store.closeModal()

    const nextStore = useGameStore.getState()
    expect(nextStore.modalQueue.length).toBe(queueBefore - 1)
    expect(nextStore.seenHints.hint_reform).toBe(true)
  })

  it('hintsEnabled=false: only original enqueued', () => {
    const store = useGameStore.getState()
    store.setHintsEnabled(false)

    store.openModal(mockOriginalPayload)

    const queue = useGameStore.getState().modalQueue
    expect(queue.length).toBe(1)
    expect(queue[0]!.priority).toBe(ModalPriority.REFORM_PROMPT)
  })

  it('already seen: only original enqueued', () => {
    const store = useGameStore.getState()
    store.markHintSeen('hint_reform')

    store.openModal(mockOriginalPayload)

    const nextStore = useGameStore.getState()
    expect(nextStore.modalQueue.length).toBe(1)
    expect(nextStore.seenHints.hint_reform).toBe(true)
  })
})
