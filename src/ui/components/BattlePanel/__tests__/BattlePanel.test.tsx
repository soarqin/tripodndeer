import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BattlePanel } from '../BattlePanel'
import type { BattleResolution } from '~/engine/systems/combat-v2'

describe('BattlePanel', () => {
  const mockResolution: BattleResolution = {
    winner: 'attacker',
    attackerLoss: 100,
    defenderLoss: 500,
    deadGenerals: [],
    steps: [
      { name: 'base-power', attackerMultiplier: 1, defenderMultiplier: 1 },
      { name: 'terrain', attackerMultiplier: 1, defenderMultiplier: 1.2 },
    ],
  }

  it('renders winner correctly', () => {
    render(<BattlePanel resolution={mockResolution} />)
    expect(screen.getByTestId('battle-winner').textContent).toContain('胜方：攻方')
    expect(screen.getByTestId('attacker-loss').textContent).toContain('攻方损失：100')
    expect(screen.getByTestId('defender-loss').textContent).toContain('守方损失：500')
  })

  it('renders defender winner correctly', () => {
    render(<BattlePanel resolution={{ ...mockResolution, winner: 'defender' }} />)
    expect(screen.getByTestId('battle-winner').textContent).toContain('胜方：守方')
  })

  it('renders modifier steps', () => {
    render(<BattlePanel resolution={mockResolution} />)
    
    const basePowerStep = screen.getByTestId('battle-step-base-power')
    expect(basePowerStep.textContent).toContain('基础战力')
    expect(basePowerStep.textContent).toContain('-') // 1.0 is formatted as '-'
    
    const terrainStep = screen.getByTestId('battle-step-terrain')
    expect(terrainStep.textContent).toContain('地形修正')
    expect(terrainStep.textContent).toContain('x1.20')
  })

  it('renders dead generals when present', () => {
    render(<BattlePanel resolution={{ ...mockResolution, deadGenerals: ['gen1'] }} />)
    expect(screen.getByTestId('battle-dead-generals').textContent).toContain('将领阵亡')
  })

  it('does not render dead generals when empty', () => {
    render(<BattlePanel resolution={mockResolution} />)
    expect(screen.queryByTestId('battle-dead-generals')).toBeNull()
  })

  it('renders close button when onClose is provided and calls it on click', () => {
    const onClose = vi.fn()
    render(<BattlePanel resolution={mockResolution} onClose={onClose} />)
    
    const closeButton = screen.getByTestId('battle-panel-close')
    expect(closeButton).toBeDefined()
    
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not render close button when onClose is not provided', () => {
    render(<BattlePanel resolution={mockResolution} />)
    expect(screen.queryByTestId('battle-panel-close')).toBeNull()
  })
})
