import { useCallback } from 'react'
import { useGameStore } from '@/ui/store'
import type { OpenModalPayload } from '@/ui/store/slices/ui-slice'
import type { HintId } from '@/ui/components/HintModal/hint-types'
import { buildHintModalPayload } from '@/ui/components/HintModal/buildHintModalPayload'
import { HINTS } from '@/content/m10_2/hints'
import { getCurrentScenarioId } from '@/ui/coordinator/use-hint-coordinator'

/**
 * useModalWithHint: wraps modal trigger with pre-modal hint check.
 *
 * LD-5 behavior:
 * - If first encounter (M9 + hintsEnabled + !seenHints[id]):
 *   ONE-TIME enqueue BOTH hint payload + original payload
 *   ModalQueue priority sorts hint (120) before original (≤100)
 *   Dismiss handlers: markHintSeen + closeModal ONLY (no re-enqueue)
 * - Otherwise: enqueue original payload only
 *
 * @param hintId - The hint ID to check
 * @param originalPayloadFactory - Factory returning the original modal payload (lazy eval)
 * @returns trigger function to call when the modal should open
 */
export function useModalWithHint(
  hintId: HintId,
  originalPayloadFactory: () => OpenModalPayload,
): () => void {
  const world = useGameStore((state) => state.world)
  const seenHints = useGameStore((state) => state.seenHints)
  const hintsEnabled = useGameStore((state) => state.hintsEnabled)
  const modalQueue = useGameStore((state) => state.modalQueue)
  const openModal = useGameStore((state) => state.openModal)
  const markHintSeen = useGameStore((state) => state.markHintSeen)
  const closeModal = useGameStore((state) => state.closeModal)
  const openCodex = useGameStore((state) => state.openCodex)

  return useCallback(() => {
    const originalPayload = originalPayloadFactory()

    const shouldShowHint =
      hintsEnabled &&
      getCurrentScenarioId(world) === 'm9' &&
      !seenHints[hintId] &&
      !modalQueue.some((modal) => modal.testId === `hint-modal-${hintId}`)

    if (!shouldShowHint) {
      openModal(originalPayload)
      return
    }

    const entry = HINTS.find((hint) => hint.id === hintId)
    if (!entry) {
      openModal(originalPayload)
      return
    }

    const hintPayload = buildHintModalPayload(
      entry,
      () => {
        markHintSeen(hintId)
        closeModal()
        openCodex(entry.codexEntryId)
      },
      () => {
        markHintSeen(hintId)
        closeModal()
      },
    )

    openModal(hintPayload)
    openModal(originalPayload)
  }, [hintId, world, seenHints, hintsEnabled, modalQueue, openModal, markHintSeen, closeModal, openCodex, originalPayloadFactory])
}
