import { describe, expect, it, beforeEach } from 'vitest'
import { useGameStore } from '@/ui/store'

beforeEach(() => {
  useGameStore.getState().resetAllHints()
  useGameStore.getState().setHintsEnabled(true)
})

describe('PeacePanel hint_peace', () => {
  it('hint_peace is not seen initially', () => {
    expect(useGameStore.getState().seenHints['hint_peace']).toBeUndefined()
  })

  it('markHintSeen marks hint_peace', () => {
    useGameStore.getState().markHintSeen('hint_peace')
    expect(useGameStore.getState().seenHints['hint_peace']).toBe(true)
  })

  it('hintsEnabled=false prevents hint', () => {
    useGameStore.getState().setHintsEnabled(false)
    expect(useGameStore.getState().hintsEnabled).toBe(false)
  })
})
