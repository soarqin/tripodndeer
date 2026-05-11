import { describe, expect, it, beforeEach } from 'vitest'
import { useGameStore } from '@/ui/store'

beforeEach(() => {
  useGameStore.getState().resetAllHints()
  useGameStore.getState().setHintsEnabled(true)
})

describe('EspionagePanel hint_espionage', () => {
  it('hint_espionage is not seen initially', () => {
    expect(useGameStore.getState().seenHints['hint_espionage']).toBeUndefined()
  })

  it('markHintSeen marks hint_espionage', () => {
    useGameStore.getState().markHintSeen('hint_espionage')
    expect(useGameStore.getState().seenHints['hint_espionage']).toBe(true)
  })

  it('hintsEnabled=false prevents hint', () => {
    useGameStore.getState().setHintsEnabled(false)
    expect(useGameStore.getState().hintsEnabled).toBe(false)
  })
})
