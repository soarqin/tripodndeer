import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { worldToSaveDTO } from '@/engine/world/save-dto'
import { useRafDriver } from '../raf-driver'
import { useGameStore } from '../game-store'
import { writeAutoRingBuffer } from '../persistence/auto-ring-buffer'
import { getCriticalAutosaveName } from '../critical-events'
import type { GameEvent, RealmId } from '~/shared/types'

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
  worldToSaveDTO: vi.fn(() => ({ schemaVersion: 6 })),
}))

const PLAYER: RealmId = 'realm_qin'
const ENEMY: RealmId = 'realm_zhao'

describe('getCriticalAutosaveName — pure function', () => {
  it('returns autosave name for rulerDied when player ruler dies', () => {
    const event: GameEvent = {
      type: 'rulerDied',
      payload: { realmId: PLAYER, generalId: 'gen_a', cause: 'natural' },
    }
    expect(getCriticalAutosaveName(event, PLAYER)).toBe('君主薨逝自动存档')
  })

  it('returns null for rulerDied when AI ruler dies', () => {
    const event: GameEvent = {
      type: 'rulerDied',
      payload: { realmId: ENEMY, generalId: 'gen_b', cause: 'natural' },
    }
    expect(getCriticalAutosaveName(event, PLAYER)).toBeNull()
  })

  it('returns autosave name for warDeclared when player is aggressor', () => {
    const event: GameEvent = {
      type: 'warDeclared',
      payload: { byRealm: PLAYER, againstRealm: ENEMY, casusBelli: null },
    }
    expect(getCriticalAutosaveName(event, PLAYER)).toBe('宣战自动存档')
  })

  it('returns autosave name for warDeclared when player is defender', () => {
    const event: GameEvent = {
      type: 'warDeclared',
      payload: { byRealm: ENEMY, againstRealm: PLAYER, casusBelli: null },
    }
    expect(getCriticalAutosaveName(event, PLAYER)).toBe('宣战自动存档')
  })

  it('returns null for warDeclared between two AI realms', () => {
    const event: GameEvent = {
      type: 'warDeclared',
      payload: { byRealm: ENEMY, againstRealm: 'realm_chu', casusBelli: null },
    }
    expect(getCriticalAutosaveName(event, PLAYER)).toBeNull()
  })

  it('returns autosave name for reformCompleted when player reform completes', () => {
    const event: GameEvent = {
      type: 'reformCompleted',
      payload: { realmId: PLAYER, reformId: 'shang_yang', success: true },
    }
    expect(getCriticalAutosaveName(event, PLAYER)).toBe('变法完成自动存档')
  })

  it('returns null for reformCompleted when AI reform completes', () => {
    const event: GameEvent = {
      type: 'reformCompleted',
      payload: { realmId: ENEMY, reformId: 'hu_fu_qi_she', success: true },
    }
    expect(getCriticalAutosaveName(event, PLAYER)).toBeNull()
  })

  it('returns autosave name for investitureChanged when player gets investiture', () => {
    const event: GameEvent = {
      type: 'investitureChanged',
      payload: { newHolderId: PLAYER, rank: 'duke' },
    }
    expect(getCriticalAutosaveName(event, PLAYER)).toBe('册封变更自动存档')
  })

  it('returns null for investitureChanged when AI gets investiture', () => {
    const event: GameEvent = {
      type: 'investitureChanged',
      payload: { newHolderId: ENEMY, rank: 'duke' },
    }
    expect(getCriticalAutosaveName(event, PLAYER)).toBeNull()
  })

  it('returns null for unrelated event types', () => {
    const event: GameEvent = { type: 'orderApplied', payload: { armyId: 'army_1' } }
    expect(getCriticalAutosaveName(event, PLAYER)).toBeNull()
  })

  it('returns null when payload is not a record', () => {
    const event: GameEvent = { type: 'rulerDied', payload: null }
    expect(getCriticalAutosaveName(event, PLAYER)).toBeNull()
  })
})

describe('useRafDriver — critical-event autosave wiring', () => {
  interface CriticalAutosaveStore {
    world: {
      tick: number
      date: { yearBC: number }
      scenarioId: 'm9'
      playerRealmId: RealmId
      realms: Map<string, { displayName: string }>
    }
    playerRealmId: RealmId
    bootStatus: 'ready'
    seenHints: Record<string, boolean>
    hintsEnabled: boolean
    events: readonly GameEvent[]
    tick: Mock
    pauseOnCriticalEvent: Mock
    enqueueToast: Mock
    showBanner: Mock
    appendEventLog: Mock
  }

  let subscriberCallback: ((state: CriticalAutosaveStore, prev: CriticalAutosaveStore) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    subscriberCallback = null
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    vi.mocked(useGameStore.subscribe).mockImplementation(((cb: never) => {
      subscriberCallback = cb
      return () => {}
    }) as never)
  })

  function makeStore(events: readonly GameEvent[] = []): CriticalAutosaveStore {
    return {
      world: {
        tick: 1,
        date: { yearBC: 260 },
        scenarioId: 'm9',
        playerRealmId: PLAYER,
        realms: new Map([[PLAYER, { displayName: '秦' }]]),
      },
      playerRealmId: PLAYER,
      bootStatus: 'ready',
      seenHints: {},
      hintsEnabled: true,
      events,
      tick: vi.fn(),
      pauseOnCriticalEvent: vi.fn(),
      enqueueToast: vi.fn(),
      showBanner: vi.fn(),
      appendEventLog: vi.fn(),
    }
  }

  function fireEvents(events: readonly GameEvent[]): void {
    const prev = makeStore([])
    const next = makeStore(events)
    vi.mocked(useGameStore.getState).mockImplementation(() => next as never)
    renderHook(() => useRafDriver())
    act(() => {
      subscriberCallback?.(next, prev)
    })
  }

  it('calls writeAutoRingBuffer with rulerDied autosave name', async () => {
    fireEvents([
      { type: 'rulerDied', payload: { realmId: PLAYER, generalId: 'gen_qin_a', cause: 'natural' } },
    ])
    await Promise.resolve()

    expect(writeAutoRingBuffer).toHaveBeenCalledTimes(1)
    expect(worldToSaveDTO).toHaveBeenCalledTimes(1)
    expect(vi.mocked(writeAutoRingBuffer).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ name: '君主薨逝自动存档' }),
    )
  })

  it('calls writeAutoRingBuffer with warDeclared autosave name', async () => {
    fireEvents([
      { type: 'warDeclared', payload: { byRealm: PLAYER, againstRealm: ENEMY } },
    ])
    await Promise.resolve()

    expect(writeAutoRingBuffer).toHaveBeenCalledTimes(1)
    expect(vi.mocked(writeAutoRingBuffer).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ name: '宣战自动存档' }),
    )
  })

  it('calls writeAutoRingBuffer with reformCompleted autosave name', async () => {
    fireEvents([
      { type: 'reformCompleted', payload: { realmId: PLAYER, reformId: 'shang_yang', success: true } },
    ])
    await Promise.resolve()

    expect(writeAutoRingBuffer).toHaveBeenCalledTimes(1)
    expect(vi.mocked(writeAutoRingBuffer).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ name: '变法完成自动存档' }),
    )
  })

  it('calls writeAutoRingBuffer with investitureChanged autosave name', async () => {
    fireEvents([
      { type: 'investitureChanged', payload: { newHolderId: PLAYER, rank: 'duke' } },
    ])
    await Promise.resolve()

    expect(writeAutoRingBuffer).toHaveBeenCalledTimes(1)
    expect(vi.mocked(writeAutoRingBuffer).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ name: '册封变更自动存档' }),
    )
  })

  it('does NOT autosave for AI-only events', async () => {
    fireEvents([
      { type: 'rulerDied', payload: { realmId: ENEMY, generalId: 'gen_zhao_a', cause: 'natural' } },
    ])
    await Promise.resolve()

    expect(writeAutoRingBuffer).not.toHaveBeenCalled()
  })

  it('triggers only ONE autosave per event batch even if multiple critical events fire', async () => {
    fireEvents([
      { type: 'rulerDied', payload: { realmId: PLAYER, generalId: 'gen_a', cause: 'natural' } },
      { type: 'warDeclared', payload: { byRealm: PLAYER, againstRealm: ENEMY } },
    ])
    await Promise.resolve()

    expect(writeAutoRingBuffer).toHaveBeenCalledTimes(1)
  })

  it('does NOT autosave while bootStatus !== ready', async () => {
    const prev = makeStore([])
    const next = makeStore([
      { type: 'rulerDied', payload: { realmId: PLAYER, generalId: 'gen_a', cause: 'natural' } },
    ])
    next.bootStatus = 'loading' as never
    vi.mocked(useGameStore.getState).mockImplementation(() => next as never)

    renderHook(() => useRafDriver())
    act(() => {
      subscriberCallback?.(next, prev)
    })
    await Promise.resolve()

    expect(writeAutoRingBuffer).not.toHaveBeenCalled()
  })
})
