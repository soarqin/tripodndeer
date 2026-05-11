import { describe, expect, it, beforeEach } from 'vitest'
import { useGameStore } from '@/ui/store'
import { ModalPriority } from '@/ui/store/game-store'

beforeEach(() => {
  useGameStore.getState().closeModal()
  useGameStore.getState().resetAllHints()
})

describe('succession hint integration', () => {
  it('HINT_FIRST_ENCOUNTER priority is higher than REFORM_PROMPT', () => {
    expect(ModalPriority.HINT_FIRST_ENCOUNTER).toBeGreaterThan(ModalPriority.REFORM_PROMPT)
  })

  it('hint_succession is not seen initially', () => {
    expect(useGameStore.getState().seenHints['hint_succession']).toBeUndefined()
  })

  it('markHintSeen marks hint_succession as seen', () => {
    useGameStore.getState().markHintSeen('hint_succession')
    expect(useGameStore.getState().seenHints['hint_succession']).toBe(true)
  })
})
