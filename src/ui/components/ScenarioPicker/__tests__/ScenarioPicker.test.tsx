import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScenarioPicker } from '../ScenarioPicker'
import { useGameStore, type GameStore } from '~/ui/store/game-store'

vi.mock('~/ui/store/game-store', () => ({
  useGameStore: vi.fn(),
}))

describe('ScenarioPicker', () => {
  const mockLoadWorld = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useGameStore).mockImplementation((selector) => {
      return selector({
        loadWorld: mockLoadWorld,
      } as unknown as GameStore)
    })
  })

  it('renders scenario picker with 2 cards', () => {
    render(<ScenarioPicker />)
    
    expect(screen.getByTestId('scenario-picker')).toBeTruthy()
    expect(screen.getByTestId('scenario-card-m1')).toBeTruthy()
    expect(screen.getByTestId('scenario-card-m9')).toBeTruthy()
  })

  it('calls loadWorld with correct id when clicking a card', async () => {
    render(<ScenarioPicker />)
    
    const m1Card = screen.getByTestId('scenario-card-m1')
    fireEvent.click(m1Card)
    
    expect(mockLoadWorld).toHaveBeenCalledWith('m1')
    
    // Should show loading state
    expect(screen.getByText('加载中...')).toBeTruthy()
    expect(m1Card.hasAttribute('disabled')).toBe(true)
  })
})
