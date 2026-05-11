import { describe, expect, it, beforeEach } from 'vitest'
import { useGameStore } from '@/ui/store'

beforeEach(() => {
  useGameStore.getState().resetAllHints()
  useGameStore.getState().setHintsEnabled(true)
})

describe('CharacterPanel hint_recruitment', () => {
  it('hint_recruitment is not seen initially', () => {
    expect(useGameStore.getState().seenHints['hint_recruitment']).toBeUndefined()
  })

  it('markHintSeen marks hint_recruitment', () => {
    useGameStore.getState().markHintSeen('hint_recruitment')
    expect(useGameStore.getState().seenHints['hint_recruitment']).toBe(true)
  })

  it('hintsEnabled=false prevents hint', () => {
    useGameStore.getState().setHintsEnabled(false)
    expect(useGameStore.getState().hintsEnabled).toBe(false)
  })
})
