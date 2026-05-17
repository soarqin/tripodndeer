import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { M10_AUTOSAVE_INTERVAL } from '@/content/m2/balance'
import { worldToSaveDTO } from '@/engine/world/save-dto'
import { useRafDriver } from '../raf-driver'
import { useGameStore } from '../game-store'
import { saveSlot } from '../persistence/slot-crud'

vi.mock('../game-store', () => ({
  useGameStore: {
    getState: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}))

vi.mock('../persistence/slot-crud', () => ({
  saveSlot: vi.fn(),
}))

vi.mock('@/engine/world/save-dto', () => ({
  worldToSaveDTO: vi.fn(() => ({ schemaVersion: 1 })),
}))

describe('useRafDriver autosave error surfacing', () => {
  let rafCallback: FrameRequestCallback | null = null

  interface AutosaveStore {
    world: {
      tick: number
      scenarioId: 'm9'
      playerRealmId: string
      realms: Map<string, { displayName: string }>
    }
    bootStatus: 'ready'
    seenHints: Record<string, boolean>
    hintsEnabled: boolean
    toastQueue: Array<{ text: string; durationMs: number }>
    tick: Mock
    enqueueToast: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()
    rafCallback = null
    const requestAnimationFrameMock = vi.fn()
    requestAnimationFrameMock.mockImplementation((cb: FrameRequestCallback) => {
      rafCallback = cb
      return 1
    })
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  function makeStore(): AutosaveStore {
    const toastQueue: Array<{ text: string; durationMs: number }> = []
    const state: AutosaveStore = {
      world: {
        tick: M10_AUTOSAVE_INTERVAL - 1,
        scenarioId: 'm9' as const,
        playerRealmId: 'realm_qin',
        realms: new Map([['realm_qin', { displayName: '秦' }]]),
      },
      bootStatus: 'ready' as const,
      seenHints: { hint_pass: true },
      hintsEnabled: true,
      toastQueue,
      tick: vi.fn(() => {
        state.world = { ...state.world, tick: state.world.tick + 1 }
      }),
      enqueueToast: vi.fn((text: string, durationMs = 10000) => {
        toastQueue.push({ text, durationMs })
      }),
    }

    return state
  }

  async function triggerAutosave(): Promise<AutosaveStore> {
    const store = makeStore()
    vi.mocked(useGameStore.getState).mockImplementation(() => store as never)
    vi.mocked(saveSlot).mockResolvedValueOnce({
      ok: false,
      error: { kind: 'quota_exceeded', message: '存储空间已满' },
    })

    renderHook(() => useRafDriver())
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)

    act(() => {
      rafCallback?.(0)
      rafCallback?.(16)
    })

    await Promise.resolve()
    await Promise.resolve()
    return store
  }

  it('enqueues a toast when autosave fails', async () => {
    const store = await triggerAutosave()

    expect(saveSlot).toHaveBeenCalledTimes(1)
    expect(worldToSaveDTO).toHaveBeenCalledTimes(1)
    expect(store.toastQueue).toHaveLength(1)
    expect(store.toastQueue[0]?.text.startsWith('[错误]')).toBe(true)
    expect(store.toastQueue[0]?.text).toContain('自动存档失败')
    expect(store.toastQueue[0]?.durationMs).toBe(5000)
    expect(store.enqueueToast).toHaveBeenCalledWith(expect.stringContaining('[错误] 自动存档失败：'), 5000)
  })

  it('does not enqueue a toast when autosave succeeds', async () => {
    const store = makeStore()
    vi.mocked(useGameStore.getState).mockImplementation(() => store as never)
    vi.mocked(saveSlot).mockResolvedValueOnce({ ok: true, value: undefined })

    renderHook(() => useRafDriver())
    act(() => {
      rafCallback?.(0)
      rafCallback?.(16)
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(saveSlot).toHaveBeenCalledTimes(1)
    expect(store.toastQueue).toHaveLength(0)
    expect(store.enqueueToast).not.toHaveBeenCalled()
  })
})
