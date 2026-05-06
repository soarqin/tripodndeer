// @vitest-environment jsdom
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { App } from '../App'

vi.mock('../rendering/map/MapCanvas', () => ({
  MapCanvas: () => <canvas data-testid="map-canvas" />,
}))
import { useGameStore } from '../ui/store/game-store'
import type { BattleResolution } from '~/engine/systems/combat-v2'

const fakeResolution: BattleResolution = {
  winner: 'attacker',
  attackerLoss: 12,
  defenderLoss: 34,
  deadGenerals: ['general_fake'],
  steps: [{ name: 'base-power', attackerMultiplier: 1, defenderMultiplier: 1 }],
}

describe('App - BattlePanel Integration', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('renders BattlePanel when lastBattleResolution is set, and closes it on click', () => {
    render(<App />)
    
    expect(screen.queryByTestId('battle-panel')).toBeNull()

    act(() => {
      useGameStore.getState().setLastBattleResolution(fakeResolution)
    })
    
    expect(screen.getByTestId('battle-panel')).toBeDefined()
    expect(screen.getByTestId('battle-winner').textContent).toContain('胜方：攻方')

    const closeButton = screen.getByTestId('battle-panel-close')
    fireEvent.click(closeButton)

    expect(screen.queryByTestId('battle-panel')).toBeNull()
    expect(useGameStore.getState().lastBattleResolution).toBeNull()
  })
})
