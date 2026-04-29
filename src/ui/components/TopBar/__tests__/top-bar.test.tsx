import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopBar } from '../TopBar'
import { INITIAL_DATE } from '@/shared/constants'

vi.mock('@/ui/store/selectors', () => ({
  useWorldDate: () => INITIAL_DATE,
  useWorldTick: () => 0,
  useSpeed: () => 'pause',
}))

describe('TopBar', () => {
  it('renders date, speed, and tick', () => {
    render(<TopBar />)
    expect(screen.getByTestId('top-bar-date').textContent).toBe('公元前 453 年 春 上旬')
    expect(screen.getByTestId('top-bar-speed').textContent).toContain('暂停')
    expect(screen.getByTestId('top-bar-tick-count').textContent).toBe('Tick: 0')
  })
})
