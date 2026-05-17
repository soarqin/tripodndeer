import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SaveLoadModal } from '@/ui/components/SaveLoadModal/SaveLoadModal'
import { useGameStore } from '../game-store'
import { listSlots, loadSlot } from '@/ui/store/persistence/slot-crud'
import { saveDtoToWorld } from '@/engine/world/save-dto'
import type { SaveDTO } from '@/shared/types/save-dto'
import type { SaveMetadata } from '@/ui/store/persistence/db'
import type { World } from '@/shared/types'

vi.mock('@/ui/store/persistence/slot-crud', () => ({
  listSlots: vi.fn(),
  saveSlot: vi.fn(),
  loadSlot: vi.fn(),
}))

vi.mock('@/engine/world/save-dto', async () => {
  const actual = await vi.importActual<typeof import('@/engine/world/save-dto')>('@/engine/world/save-dto')
  return {
    ...actual,
    worldToSaveDTO: vi.fn(),
    saveDtoToWorld: vi.fn(),
  }
})

describe('SaveLoadModal hint-state load roundtrip', () => {
  const mockWorld = {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 100,
    sites: new Map(),
    realms: new Map([['realm_qin', { displayName: '秦' }]]),
    playerRealmId: 'realm_qin',
    scenarioId: 'm1',
    tutorialState: null,
  }

  beforeEach(() => {
    useGameStore.getState().reset()
    vi.clearAllMocks()
  })

  it('restores seenHints and hintsEnabled when loading a save', async () => {
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: 'Test Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' },
    ])

    const dto = {
      schemaVersion: 5,
      world: {},
      seenHints: { 'first-conquest': true },
      hintsEnabled: false,
    } as unknown as SaveDTO

    vi.mocked(loadSlot).mockResolvedValue({
      ok: true,
      value: {
        slotId: 'slot1',
        dto,
        metadata: {} as unknown as SaveMetadata,
      },
    })

    vi.mocked(saveDtoToWorld).mockReturnValue({
      ok: true,
      value: mockWorld as unknown as World,
    })

    useGameStore.setState({ seenHints: {}, hintsEnabled: true })

    render(<SaveLoadModal mode="load" />)

    await waitFor(() => {
      expect(listSlots).toHaveBeenCalled()
    })

    fireEvent.click(await screen.findByTestId('slot-slot1'))

    await waitFor(() => {
      expect(useGameStore.getState().seenHints).toEqual({ 'first-conquest': true })
      expect(useGameStore.getState().hintsEnabled).toBe(false)
    })
  })

  it('defaults seenHints and hintsEnabled when save omits hint fields', async () => {
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: 'Test Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' },
    ])

    const dto = {
      schemaVersion: 5,
      world: {},
    } as unknown as SaveDTO

    vi.mocked(loadSlot).mockResolvedValue({
      ok: true,
      value: {
        slotId: 'slot1',
        dto,
        metadata: {} as unknown as SaveMetadata,
      },
    })

    vi.mocked(saveDtoToWorld).mockReturnValue({
      ok: true,
      value: mockWorld as unknown as World,
    })

    useGameStore.setState({ seenHints: { stale: true } as Record<string, true>, hintsEnabled: false })

    render(<SaveLoadModal mode="load" />)

    await waitFor(() => {
      expect(listSlots).toHaveBeenCalled()
    })

    fireEvent.click(await screen.findByTestId('slot-slot1'))

    await waitFor(() => {
      expect(useGameStore.getState().seenHints).toEqual({})
      expect(useGameStore.getState().hintsEnabled).toBe(true)
    })
  })
})
