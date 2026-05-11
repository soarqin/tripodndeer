import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SaveLoadModal } from '../SaveLoadModal'
import { useGameStore } from '@/ui/store'
import { listSlots, loadSlot } from '@/ui/store/persistence/slot-crud'
import { saveDtoToWorld } from '@/engine/world/save-dto'
import type { SaveDTO } from '@/shared/types/save-dto'
import type { SaveMetadata } from '@/ui/store/persistence/db'
import type { World } from '@/shared/types'
import type { GameStoreState } from '@/ui/store/game-store'

vi.mock('@/ui/store', () => ({
  useGameStore: vi.fn(),
}))

vi.mock('@/ui/store/persistence/slot-crud', () => ({
  listSlots: vi.fn(),
  saveSlot: vi.fn(),
  loadSlot: vi.fn(),
}))

vi.mock('@/engine/world/save-dto', () => ({
  worldToSaveDTO: vi.fn(),
  saveDtoToWorld: vi.fn(),
}))

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
    
    vi.mocked(listSlots).mockResolvedValue([])
  })

  it('renders 6 slots in save mode', async () => {
    render(<SaveLoadModal mode="save" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('save-load-modal')).toBeTruthy()
    })
    
    expect(screen.getByTestId('slot-slot1')).toBeTruthy()
    expect(screen.getByTestId('slot-slot5')).toBeTruthy()
    expect(screen.getByTestId('slot-auto')).toBeTruthy()
  })

  it('shows name input when clicking empty slot in save mode', async () => {
    render(<SaveLoadModal mode="save" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('slot-slot1')).toBeTruthy()
    })
    
    fireEvent.click(screen.getByTestId('slot-slot1'))
    
    expect(screen.getByTestId('save-name-input')).toBeTruthy()
    expect(screen.getByTestId('save-confirm-btn')).toBeTruthy()
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

  it('shows error message on incompatible version', async () => {
    vi.mocked(listSlots).mockResolvedValue([
      { slotId: 'slot1', name: 'Test Save', createdAt: 123, tick: 100, scenarioId: 'm1', playerRealmName: '秦' }
    ])
    
    vi.mocked(loadSlot).mockResolvedValue({
      ok: false,
      error: {
        kind: 'incompatible_version',
        message: 'Incompatible save version',
        got: 0,
        expected: 1,
      }
    })
    
    render(<SaveLoadModal mode="load" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('slot-slot1-meta')).toBeTruthy()
    })
    
    fireEvent.click(screen.getByTestId('slot-slot1'))
    
    await waitFor(() => {
      expect(screen.getByTestId('save-load-error').textContent).toContain('存档版本不兼容 (需要 1, 实际 0)')
    })
  })
})
