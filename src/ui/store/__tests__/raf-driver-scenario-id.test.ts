import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { M10_AUTOSAVE_INTERVAL } from '@/content/m2/balance'
import { useRafDriver } from '../raf-driver'
import { useGameStore } from '../game-store'
import { saveSlot } from '../persistence/slot-crud'
import { worldToSaveDTO } from '@/engine/world/save-dto'

vi.mock('../game-store', () => ({
  useGameStore: {
    getState: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}))

vi.mock('../persistence/slot-crud', () => ({
  saveSlot: vi.fn(() => Promise.resolve({ ok: true, value: undefined })),
}))

vi.mock('@/engine/world/save-dto', () => ({
  worldToSaveDTO: vi.fn(() => ({ schemaVersion: 1 })),
}))

describe('useRafDriver autosave scenarioId', () => {
  let rafCallback: FrameRequestCallback | null = null

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

  function makeStore(scenarioId: 'm1' | 'm9' | 'tutorial') {
    const state = {
      world: {
        tick: M10_AUTOSAVE_INTERVAL - 1,
        scenarioId,
        playerRealmId: 'realm_qin',
        realms: new Map([['realm_qin', { displayName: '秦' }]]),
      },
      bootStatus: 'ready' as const,
      seenHints: { hint_pass: true },
      hintsEnabled: true,
      tick: vi.fn(() => {
        state.world = { ...state.world, tick: state.world.tick + 1 }
      }),
    }

    return state
  }

  async function runAutosaveScenario(scenarioId: 'm1' | 'm9' | 'tutorial') {
    const store = makeStore(scenarioId)
    vi.mocked(useGameStore.getState).mockImplementation(() => store as never)

    renderHook(() => useRafDriver())
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)

    act(() => {
      rafCallback?.(0)
      rafCallback?.(16)
    })

    expect(saveSlot).toHaveBeenCalledTimes(1)
    expect(worldToSaveDTO).toHaveBeenCalledWith(store.world, scenarioId, {
      seenHints: store.seenHints,
      hintsEnabled: store.hintsEnabled,
    })
    expect(vi.mocked(saveSlot)).toHaveBeenCalledWith(
      'auto',
      expect.anything(),
      expect.objectContaining({ scenarioId }),
    )
  }

  it('autosaves M9 world with scenarioId m9', async () => {
    await runAutosaveScenario('m9')
  })

  it('autosaves M1 world with scenarioId m1', async () => {
    await runAutosaveScenario('m1')
  })

  it('autosaves tutorial world with scenarioId tutorial', async () => {
    await runAutosaveScenario('tutorial')
  })
})
