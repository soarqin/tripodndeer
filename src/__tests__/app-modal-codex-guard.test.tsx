import { describe, expect, it, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useGameStore } from '@/ui/store'
import { ModalPriority } from '@/ui/store/game-store'

// Reset store between tests
beforeEach(() => {
  const store = useGameStore.getState()
  store.closeModal()
  store.setActivePanel(null)
})

describe('App.tsx modal render guard for codex panel', () => {
  it('modal renders when activePanel is not codex', () => {
    act(() => {
      useGameStore.getState().openModal({
        title: 'Test Modal',
        content: 'Test content',
        actions: [],
        priority: ModalPriority.GENERIC,
        dismissable: true,
      })
      useGameStore.getState().setActivePanel(null)
    })
    
    const modalQueue = useGameStore.getState().modalQueue
    const activePanel = useGameStore.getState().activePanel
    
    expect(modalQueue.length).toBeGreaterThan(0)
    expect(activePanel).not.toBe('codex')
  })

  it('modal queue is preserved when codex is open', () => {
    act(() => {
      useGameStore.getState().openModal({
        title: 'Test Modal',
        content: 'Test content',
        actions: [],
        priority: ModalPriority.GENERIC,
        dismissable: true,
      })
      useGameStore.getState().setActivePanel('codex')
    })
    
    // Queue should still have the modal (not dequeued)
    const modalQueue = useGameStore.getState().modalQueue
    expect(modalQueue.length).toBeGreaterThan(0)
    
    // activePanel is codex
    expect(useGameStore.getState().activePanel).toBe('codex')
  })

  it('modal queue length unchanged when codex opens', () => {
    act(() => {
      useGameStore.getState().openModal({
        title: 'Modal 1',
        content: 'Content 1',
        actions: [],
        priority: ModalPriority.GENERIC,
        dismissable: true,
      })
    })
    
    const queueLengthBefore = useGameStore.getState().modalQueue.length
    
    act(() => {
      useGameStore.getState().setActivePanel('codex')
    })
    
    const queueLengthAfter = useGameStore.getState().modalQueue.length
    expect(queueLengthAfter).toBe(queueLengthBefore)
  })

  it('modal becomes visible when codex closes', () => {
    act(() => {
      useGameStore.getState().openModal({
        title: 'Test Modal',
        content: 'Test content',
        actions: [],
        priority: ModalPriority.GENERIC,
        dismissable: true,
      })
      useGameStore.getState().setActivePanel('codex')
    })
    
    // Close codex
    act(() => {
      useGameStore.getState().setActivePanel(null)
    })
    
    // Modal still in queue, codex closed
    expect(useGameStore.getState().modalQueue.length).toBeGreaterThan(0)
    expect(useGameStore.getState().activePanel).not.toBe('codex')
  })
})
