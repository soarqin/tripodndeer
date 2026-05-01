import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimeControlBar } from '../TimeControlBar'

const mockSetSpeed = vi.fn()
const mockSpeed = 'pause'

vi.mock('@/ui/store/selectors', () => ({
  useSpeed: () => mockSpeed,
}))
vi.mock('@/ui/store/game-store', () => ({
  useGameStore: (selector: (s: { setSpeed: typeof mockSetSpeed }) => unknown) =>
    selector({ setSpeed: mockSetSpeed }),
}))

describe('TimeControlBar', () => {
  it('renders localized pause plus exact visible speed notation', () => {
    render(<TimeControlBar />)

    expect(screen.getByText(/暂停/)).toBeTruthy()
    expect(screen.queryByText(/^pause$/)).toBeNull()

    for (const tier of ['1x', '2x', '3x', '4x', '5x']) {
      expect(screen.getByRole('button', { name: new RegExp(tier) })).toBeTruthy()
    }
  })

  it('clicking 3x calls setSpeed with 3x', () => {
    render(<TimeControlBar />)
    fireEvent.click(screen.getByTestId('time-control-3x'))
    expect(mockSetSpeed).toHaveBeenCalledWith('3x')
  })

  it('pause button has aria-pressed=true when paused', () => {
    render(<TimeControlBar />)
    const pauseBtn = screen.getByTestId('time-control-pause')
    expect(pauseBtn.getAttribute('aria-pressed')).toBe('true')
  })
})
