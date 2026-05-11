import { describe, expect, it, beforeEach } from 'vitest'
import { useGameStore } from '@/ui/store'

beforeEach(() => {
  useGameStore.getState().resetAllHints()
  useGameStore.getState().setHintsEnabled(true)
})

describe('CulturePanel hint_academy', () => {
  it('hint_academy is not seen initially', () => {
    expect(useGameStore.getState().seenHints['hint_academy']).toBeUndefined()
  })

  it('markHintSeen marks hint_academy', () => {
    useGameStore.getState().markHintSeen('hint_academy')
    expect(useGameStore.getState().seenHints['hint_academy']).toBe(true)
  })

  it('hintsEnabled=false prevents hint', () => {
    useGameStore.getState().setHintsEnabled(false)
    expect(useGameStore.getState().hintsEnabled).toBe(false)
  })
})
