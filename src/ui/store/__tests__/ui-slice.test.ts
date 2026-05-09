import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../game-store'

const modalPayload = {
  title: '测试模态',
  content: 'content',
  actions: [],
  dismissable: true,
}

beforeEach(() => {
  useGameStore.getState().reset()
  useGameStore.getState().clearModalQueue()
})

describe('codex actions', () => {
  it('starts with no saved codex clock speed', () => {
    expect(useGameStore.getState().codexPreviousClockSpeed).toBeNull()
  })

  it('openCodex pauses the clock and stores the previous speed', () => {
    useGameStore.getState().setSpeed('3x')
    useGameStore.getState().openCodex('mechanic-legitimacy')

    const state = useGameStore.getState()
    expect(state.activePanel).toBe('codex')
    expect(state.selectedCodexEntryId).toBe('mechanic-legitimacy')
    expect(state.clockState.speed).toBe('pause')
    expect(state.codexPreviousClockSpeed).toBe('3x')
  })

  it('openCodex without an entry keeps the selection null', () => {
    useGameStore.getState().setSpeed('2x')
    useGameStore.getState().openCodex()

    const state = useGameStore.getState()
    expect(state.selectedCodexEntryId).toBeNull()
    expect(state.clockState.speed).toBe('pause')
    expect(state.codexPreviousClockSpeed).toBe('2x')
  })

  it('openCodex while already paused does not save a previous speed', () => {
    useGameStore.getState().openCodex('entry-1')

    const state = useGameStore.getState()
    expect(state.clockState.speed).toBe('pause')
    expect(state.codexPreviousClockSpeed).toBeNull()
  })

  it('closeCodex restores the saved speed and clears codex state', () => {
    useGameStore.getState().setSpeed('4x')
    useGameStore.getState().openCodex('entry-1')
    useGameStore.getState().closeCodex()

    const state = useGameStore.getState()
    expect(state.activePanel).toBeNull()
    expect(state.selectedCodexEntryId).toBeNull()
    expect(state.clockState.speed).toBe('4x')
    expect(state.codexPreviousClockSpeed).toBeNull()
  })

  it('closeCodex keeps the clock paused when there is nothing to restore', () => {
    useGameStore.getState().openCodex()
    useGameStore.getState().closeCodex()

    const state = useGameStore.getState()
    expect(state.clockState.speed).toBe('pause')
    expect(state.codexPreviousClockSpeed).toBeNull()
  })

  it('selectCodexEntry only updates the selected entry', () => {
    useGameStore.getState().setSpeed('5x')
    useGameStore.getState().selectCodexEntry('xx')

    const state = useGameStore.getState()
    expect(state.selectedCodexEntryId).toBe('xx')
    expect(state.clockState.speed).toBe('5x')
    expect(state.codexPreviousClockSpeed).toBeNull()
  })

  it('supports nested modal and codex clock restoration', () => {
    useGameStore.getState().setSpeed('5x')
    useGameStore.getState().openCodex()
    useGameStore.getState().openModal(modalPayload)
    useGameStore.getState().closeModal()
    useGameStore.getState().closeCodex()

    const state = useGameStore.getState()
    expect(state.clockState.speed).toBe('5x')
    expect(state.codexPreviousClockSpeed).toBeNull()
    expect(state.previousClockSpeed).toBe('pause')
    expect(state.modalQueue).toEqual([])
  })
})
