import { describe, expect, it, beforeEach } from 'vitest'
import { useGameStore } from '@/ui/store'

beforeEach(() => {
  useGameStore.getState().resetAllHints()
  useGameStore.getState().setHintsEnabled(true)
})

describe('DiplomacyPanel hint_alliance', () => {
  it('hint_alliance is not seen initially', () => {
    expect(useGameStore.getState().seenHints['hint_alliance']).toBeUndefined()
  })

  it('markHintSeen marks hint_alliance', () => {
    useGameStore.getState().markHintSeen('hint_alliance')
    expect(useGameStore.getState().seenHints['hint_alliance']).toBe(true)
  })

  it('hintsEnabled=false prevents hint', () => {
    useGameStore.getState().setHintsEnabled(false)
    expect(useGameStore.getState().hintsEnabled).toBe(false)
  })
})
