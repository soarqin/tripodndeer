import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRafDriver } from '../raf-driver'
import { useGameStore } from '../game-store'
import { writeAutoRingBuffer } from '../persistence/auto-ring-buffer'

vi.mock('../game-store', () => ({
  useGameStore: {
    getState: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}))

vi.mock('../persistence/auto-ring-buffer', () => ({
  writeAutoRingBuffer: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/engine/world/save-dto', () => ({
  worldToSaveDTO: vi.fn(() => ({ schemaVersion: 1 })),
}))

describe('useRafDriver yearly autosave', () => {
  let rafCallback: FrameRequestCallback | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    rafCallback = null
    const requestAnimationFrameMock = vi.fn().mockImplementation((cb: FrameRequestCallback) => {
      rafCallback = cb
      return 1
    })
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })

  function makeStore() {
    const state = {
      world: {
        tick: 1,
        date: { yearBC: 260 },
        scenarioId: 'm9' as const,
        playerRealmId: 'realm_qin',
        realms: new Map([['realm_qin', { displayName: '秦' }]]),
      },
      bootStatus: 'ready' as const,
      seenHints: { hint_pass: true },
      hintsEnabled: true,
      events: [],
      tick: vi.fn(() => {
        state.world = { ...state.world, tick: state.world.tick + 1 }
      }),
      pauseOnCriticalEvent: vi.fn(),
      enqueueToast: vi.fn(),
      showBanner: vi.fn(),
      appendEventLog: vi.fn(),
    }

    return state
  }

  function mountDriver(store = makeStore()) {
    vi.mocked(useGameStore.getState).mockImplementation(() => store as never)
    renderHook(() => useRafDriver())
    return store
  }

  function runTwoFrames(): void {
    act(() => {
      rafCallback?.(0)
      rafCallback?.(16)
    })
  }

  it('does not yearly autosave within the same year', () => {
    mountDriver()
    runTwoFrames()

    expect(writeAutoRingBuffer).not.toHaveBeenCalled()
  })

  it('yearly autosaves when yearBC changes across a tick', () => {
    const store = makeStore()
    store.tick = vi.fn(() => {
      store.world = { ...store.world, tick: store.world.tick + 1 }
      if (store.world.tick === 2) {
        store.world = { ...store.world, date: { yearBC: 259 } }
      }
    })
    mountDriver(store)
    runTwoFrames()

    expect(writeAutoRingBuffer).toHaveBeenCalledTimes(1)
    expect(vi.mocked(writeAutoRingBuffer).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ name: '自动存档 (259 BC)' }),
    )
  })

  it('only yearly autosaves once across multiple same-year ticks', () => {
    const store = makeStore()
    mountDriver(store)

    act(() => {
      rafCallback?.(0)
      rafCallback?.(16)
      rafCallback?.(32)
      rafCallback?.(48)
    })

    expect(writeAutoRingBuffer).not.toHaveBeenCalled()
  })

  it('catch-up autosaves on visibilitychange after a year change', () => {
    const store = mountDriver()
    runTwoFrames()

    store.world = { ...store.world, date: { yearBC: 259 } }
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(writeAutoRingBuffer).toHaveBeenCalledTimes(1)
    expect(vi.mocked(writeAutoRingBuffer).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ name: '自动存档 (259 BC)' }),
    )
  })
})
