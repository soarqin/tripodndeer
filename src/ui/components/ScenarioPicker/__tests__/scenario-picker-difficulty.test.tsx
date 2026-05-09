import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScenarioPicker } from '../ScenarioPicker'
import { useGameStore, type GameStore } from '~/ui/store/game-store'

vi.mock('~/ui/store/game-store', () => ({
  useGameStore: vi.fn(),
}))

describe('ScenarioPicker Difficulty', () => {
  const mockLoadWorld = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useGameStore).mockImplementation((selector) => {
      return selector({
        loadWorld: mockLoadWorld,
      } as unknown as GameStore)
    })
  })

  it('shows default difficulty as hero (雄主)', () => {
    render(<ScenarioPicker />)
    
    const select = screen.getByTestId('difficulty-select') as HTMLSelectElement
    expect(select.value).toBe('hero')
    
    const selectedOption = select.options[select.selectedIndex]
    expect(selectedOption?.text).toBe('雄主 (hero - 默认)')
  })

  it('passes selected difficulty to loadWorld', () => {
    render(<ScenarioPicker />)
    
    const select = screen.getByTestId('difficulty-select')
    fireEvent.change(select, { target: { value: 'hegemon' } })
    
    const m9Card = screen.getByTestId('scenario-card-m9')
    fireEvent.click(m9Card)
    
    expect(mockLoadWorld).toHaveBeenCalledWith('m9', 'hegemon')
  })
})
