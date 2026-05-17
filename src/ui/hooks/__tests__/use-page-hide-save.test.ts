import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePageHideSave } from '../use-page-hide-save'
import { useGameStore } from '@/ui/store/game-store'
import { worldToSaveDTO } from '~/engine/world/save-dto'
import { writeAutoRingBuffer } from '~/ui/store/persistence/auto-ring-buffer'

vi.mock('@/ui/store/game-store', () => ({
  useGameStore: {
    getState: vi.fn(),
  },
}))

vi.mock('~/engine/world/save-dto', () => ({
  worldToSaveDTO: vi.fn(() => ({ schemaVersion: 1 })),
}))

vi.mock('~/ui/store/persistence/auto-ring-buffer', () => ({
  writeAutoRingBuffer: vi.fn(() => Promise.resolve()),
}))

describe('usePageHideSave', () => {
  const world = {
    tick: 123,
    scenarioId: 'm9' as const,
    playerRealmId: 'realm_qin',
    realms: new Map([['realm_qin', { displayName: '秦' }]]),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })

  function setReadyState(bootStatus: 'pending' | 'ready' = 'ready') {
    vi.mocked(useGameStore.getState).mockReturnValue({
      bootStatus,
      world,
      seenHints: { hint_pass: true },
      hintsEnabled: true,
    } as never)
  }

  it('writes on pagehide', async () => {
    setReadyState()

    const { unmount } = renderHook(() => usePageHideSave())
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    await Promise.resolve()

    expect(worldToSaveDTO).toHaveBeenCalledWith(world, 'm9', {
      seenHints: { hint_pass: true },
      hintsEnabled: true,
    })
    expect(writeAutoRingBuffer).toHaveBeenCalledTimes(1)
    expect(writeAutoRingBuffer).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        slotId: 'auto_0',
        name: '退出时自动存档',
        tick: 123,
        scenarioId: 'm9',
        playerRealmName: '秦',
      }),
    )

    unmount()
  })

  it('does not write after unmount', () => {
    setReadyState()

    const { unmount } = renderHook(() => usePageHideSave())
    unmount()

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    expect(writeAutoRingBuffer).not.toHaveBeenCalled()
  })

  it('does not write when bootStatus is not ready', () => {
    setReadyState('pending')

    renderHook(() => usePageHideSave())

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    expect(writeAutoRingBuffer).not.toHaveBeenCalled()
    expect(worldToSaveDTO).not.toHaveBeenCalled()
  })

  it('writes on visibilitychange to hidden', () => {
    setReadyState()

    renderHook(() => usePageHideSave())

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(writeAutoRingBuffer).toHaveBeenCalledTimes(1)
  })
})
