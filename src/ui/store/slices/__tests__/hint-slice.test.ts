import { describe, expect, it } from 'vitest'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { HintSlice } from '../hint-slice'
import { createHintSlice } from '../hint-slice'

function makeTestStore() {
  return create<HintSlice>()(
    immer((set, get) => createHintSlice(set as never, get as never)),
  )
}

describe('hint-slice', () => {
  it('default state: seenHints={}, hintsEnabled=true', () => {
    const store = makeTestStore()
    const state = store.getState()
    expect(state.seenHints).toEqual({})
    expect(state.hintsEnabled).toBe(true)
  })

  it('markHintSeen marks a hint as seen', () => {
    const store = makeTestStore()
    store.getState().markHintSeen('hint_reform')
    expect(store.getState().seenHints['hint_reform']).toBe(true)
  })

  it('markHintSeen is idempotent', () => {
    const store = makeTestStore()
    store.getState().markHintSeen('hint_reform')
    store.getState().markHintSeen('hint_reform')
    expect(store.getState().seenHints['hint_reform']).toBe(true)
    expect(Object.keys(store.getState().seenHints).length).toBe(1)
  })

  it('resetAllHints clears seenHints', () => {
    const store = makeTestStore()
    store.getState().markHintSeen('hint_reform')
    store.getState().markHintSeen('hint_pass')
    store.getState().resetAllHints()
    expect(store.getState().seenHints).toEqual({})
  })

  it('setHintsEnabled toggles boolean', () => {
    const store = makeTestStore()
    store.getState().setHintsEnabled(false)
    expect(store.getState().hintsEnabled).toBe(false)
    store.getState().setHintsEnabled(true)
    expect(store.getState().hintsEnabled).toBe(true)
  })

  it('isHintSeen returns false for unknown id', () => {
    const store = makeTestStore()
    expect(store.getState().isHintSeen('hint_unknown')).toBe(false)
  })

  it('isHintSeen returns true after markHintSeen', () => {
    const store = makeTestStore()
    store.getState().markHintSeen('hint_reform')
    expect(store.getState().isHintSeen('hint_reform')).toBe(true)
  })

  it('isHintsEnabled returns current hintsEnabled value', () => {
    const store = makeTestStore()
    expect(store.getState().isHintsEnabled()).toBe(true)
    store.getState().setHintsEnabled(false)
    expect(store.getState().isHintsEnabled()).toBe(false)
  })
})
