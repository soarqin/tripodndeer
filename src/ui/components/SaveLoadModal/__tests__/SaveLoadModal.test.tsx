import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SaveLoadModal } from '../SaveLoadModal'
import { useGameStore } from '@/ui/store'
import { listSlots, loadSlot, deleteSlot, renameSlot } from '@/ui/store/persistence/slot-crud'
import { saveDtoToWorld } from '@/engine/world/save-dto'
import type { SaveDTO } from '@/shared/types/save-dto'
import type { SaveMetadata } from '@/ui/store/persistence/db'
import type { World } from '@/shared/types'
import type { GameStoreState } from '@/ui/store/game-store'

vi.mock('@/ui/store', () => ({
  useGameStore: Object.assign(vi.fn(), { setState: vi.fn() }),
}))

vi.mock('@/ui/store/persistence/slot-crud', async () => {
  const actual = await vi.importActual<typeof import('@/ui/store/persistence/slot-crud')>(
    '@/ui/store/persistence/slot-crud',
  )
  return {
    ...actual,
    listSlots: vi.fn(),
    saveSlot: vi.fn(),
    loadSlot: vi.fn(),
    deleteSlot: vi.fn(),
    renameSlot: vi.fn(),
  }
})

vi.mock('@/engine/world/save-dto', async () => {
  const actual = await vi.importActual<typeof import('@/engine/world/save-dto')>('@/engine/world/save-dto')
  return {
    ...actual,
    worldToSaveDTO: vi.fn(),
    saveDtoToWorld: vi.fn(),
    saveDtoToHintState: vi.fn().mockReturnValue({ seenHints: {}, hintsEnabled: true }),
  }
})

describe('SaveLoadModal', () => {
  const mockWorld = {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    tick: 100,
    sites: new Map(),
    realms: new Map([['realm_qin', { displayName: '秦' }]]),
    playerRealmId: 'realm_qin',
    scenarioId: 'm1',
    tutorialState: null,
  }
  
  const mockReplaceWorldFromSave = vi.fn()
  const mockCloseModal = vi.fn()
  const mockSetState = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(useGameStore).mockImplementation((selector) => {
      const state = {
        world: mockWorld,
        replaceWorldFromSave: mockReplaceWorldFromSave,
        closeModal: mockCloseModal,
      }
      return selector(state as unknown as GameStoreState)
    })
    ;(useGameStore as unknown as { setState: typeof mockSetState }).setState = mockSetState
    
    vi.mocked(listSlots).mockResolvedValue([])
  })

  it('renders manual and auto slots with section headers', async () => {
    render(<SaveLoadModal mode="save" />)

    await waitFor(() => {
      expect(screen.getByTestId('save-load-modal')).toBeTruthy()
    })

    expect(screen.getByText('手书史册')).toBeTruthy()
    expect(screen.getByText('天道流转')).toBeTruthy()

    expect(screen.getByTestId('slot-slot1')).toBeTruthy()
    expect(screen.getByTestId('slot-slot5')).toBeTruthy()
    expect(screen.getByTestId('slot-auto_0')).toBeTruthy()
    expect(screen.getByTestId('slot-auto_9')).toBeTruthy()
  })

  it('shows name input when clicking empty manual slot in save mode', async () => {
    render(<SaveLoadModal mode="save" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('slot-slot1')).toBeTruthy()
    })
    
    fireEvent.click(screen.getByTestId('slot-slot1'))
    
    expect(screen.getByTestId('save-name-input')).toBeTruthy()
    expect(screen.getByTestId('save-confirm-btn')).toBeTruthy()
  })

  it('does not allow saving to auto slots', async () => {
    render(<SaveLoadModal mode="save" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('slot-auto_0')).toBeTruthy()
    })
    
    fireEvent.click(screen.getByTestId('slot-auto_0'))
    
    expect(screen.queryByTestId('save-name-input')).toBeNull()
  })

  it('disables empty slots in load mode', async () => {
    render(<SaveLoadModal mode="load" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('slot-slot1')).toBeTruthy()
    })
    
    const slot1 = screen.getByTestId('slot-slot1')
    expect(slot1.className).toContain('disabled')
    
    fireEvent.click(slot1)
    expect(screen.queryByTestId('save-name-input')).toBeNull()
    expect(mockReplaceWorldFromSave).not.toHaveBeenCalled()
  })

  it('calls loadSlot and replaceWorldFromSave when clicking used slot in load mode', async () => {
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: 'Test Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' }
    ])
    
    vi.mocked(loadSlot).mockResolvedValue({
      ok: true,
      value: {
        slotId: 'slot1',
        dto: { schemaVersion: 1, world: {} } as unknown as SaveDTO,
        metadata: {} as unknown as SaveMetadata
      }
    })
    
    vi.mocked(saveDtoToWorld).mockReturnValue({
      ok: true,
      value: { scenarioId: 'm1', tutorialState: null } as unknown as World
    })
    
    render(<SaveLoadModal mode="load" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('slot-slot1-meta')).toBeTruthy()
    })
    
    fireEvent.click(screen.getByTestId('slot-slot1'))
    
    await waitFor(() => {
      expect(loadSlot).toHaveBeenCalledWith('slot1')
      expect(mockReplaceWorldFromSave).toHaveBeenCalled()
      expect(mockCloseModal).toHaveBeenCalled()
    })
  })

  it('shows delete and rename buttons on used manual slots, but not on auto slots', async () => {
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: 'Manual Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' },
      { slotId: 'auto_0', name: 'Auto Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' }
    ])

    render(<SaveLoadModal mode="load" />)

    await waitFor(() => {
      expect(screen.getByTestId('slot-slot1-meta')).toBeTruthy()
      expect(screen.getByTestId('slot-auto_0-meta')).toBeTruthy()
    })

    expect(screen.getByTestId('delete-btn-slot1')).toBeTruthy()
    expect(screen.getByTestId('rename-btn-slot1')).toBeTruthy()

    expect(screen.queryByTestId('delete-btn-auto_0')).toBeNull()
    expect(screen.queryByTestId('rename-btn-auto_0')).toBeNull()
  })

  it('deletes slot after confirmation', async () => {
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: 'Manual Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' }
    ])

    render(<SaveLoadModal mode="load" />)

    await waitFor(() => {
      expect(screen.getByTestId('delete-btn-slot1')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('delete-btn-slot1'))

    await waitFor(() => {
      expect(screen.getByTestId('delete-confirm-modal')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('confirm-delete-btn'))

    await waitFor(() => {
      expect(deleteSlot).toHaveBeenCalledWith('slot1')
      expect(listSlots).toHaveBeenCalledTimes(2) // Initial + after delete
    })
  })

  it('cancels delete slot', async () => {
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: 'Manual Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' }
    ])

    render(<SaveLoadModal mode="load" />)

    await waitFor(() => {
      expect(screen.getByTestId('delete-btn-slot1')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('delete-btn-slot1'))

    await waitFor(() => {
      expect(screen.getByTestId('delete-confirm-modal')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('modal-action-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-confirm-modal')).toBeNull()
      expect(deleteSlot).not.toHaveBeenCalled()
    })
  })

  it('renames slot successfully', async () => {
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: 'Manual Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' }
    ])

    render(<SaveLoadModal mode="load" />)

    await waitFor(() => {
      expect(screen.getByTestId('rename-btn-slot1')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('rename-btn-slot1'))

    await waitFor(() => {
      expect(screen.getByTestId('rename-input-slot1')).toBeTruthy()
    })

    const input = screen.getByTestId('rename-input-slot1')
    fireEvent.change(input, { target: { value: 'New Name' } })
    
    fireEvent.click(screen.getByTestId('rename-submit-slot1'))

    await waitFor(() => {
      expect(renameSlot).toHaveBeenCalledWith('slot1', 'New Name')
      expect(listSlots).toHaveBeenCalledTimes(2) // Initial + after rename
    })
  })

  it('rejects empty rename', async () => {
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: 'Manual Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' }
    ])

    render(<SaveLoadModal mode="load" />)

    await waitFor(() => {
      expect(screen.getByTestId('rename-btn-slot1')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('rename-btn-slot1'))

    await waitFor(() => {
      expect(screen.getByTestId('rename-input-slot1')).toBeTruthy()
    })

    const input = screen.getByTestId('rename-input-slot1')
    fireEvent.change(input, { target: { value: '   ' } })
    
    fireEvent.click(screen.getByTestId('rename-submit-slot1'))

    await waitFor(() => {
      expect(renameSlot).not.toHaveBeenCalled()
      expect(screen.getByTestId('save-load-error').textContent).toContain('存档名称不能为空')
    })
  })
})
