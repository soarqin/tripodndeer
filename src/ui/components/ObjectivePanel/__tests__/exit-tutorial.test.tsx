import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ObjectivePanel } from '../ObjectivePanel'
import { TopBar } from '../../TopBar/TopBar'
import { useGameStore } from '~/ui/store'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type { World } from '~/shared'

describe('Exit Tutorial Button', () => {
  let m1World: World

  beforeEach(async () => {
    const m1Data = await loadM1Data()
    m1World = createWorldFromM1Data(m1Data, 42, 'realm_qin')
  })

  describe('ObjectivePanel', () => {
    it('does not render exit button in M1 scenario', () => {
      useGameStore.setState({ world: m1World })
      render(<ObjectivePanel />)
      expect(screen.queryByTestId('exit-tutorial-btn')).toBeNull()
    })

    it('renders exit button in tutorial scenario', () => {
      const tutorialWorld: World = {
        ...m1World,
        scenarioId: 'tutorial',
        tutorialState: {
          currentStep: 'panel-tour',
          completedSteps: new Set(),
          startedAt: m1World.date,
          dismissedStepHints: new Set(),
          panelsOpened: new Set(),
          timeoutHintShown: false,
        },
      }
      useGameStore.setState({ world: tutorialWorld })
      render(<ObjectivePanel />)
      
      expect(screen.getByTestId('exit-tutorial-btn')).toBeDefined()
    })

    it('shows confirmation dialog when clicked', () => {
      const tutorialWorld: World = {
        ...m1World,
        scenarioId: 'tutorial',
        tutorialState: {
          currentStep: 'panel-tour',
          completedSteps: new Set(),
          startedAt: m1World.date,
          dismissedStepHints: new Set(),
          panelsOpened: new Set(),
          timeoutHintShown: false,
        },
      }
      useGameStore.setState({ world: tutorialWorld })
      render(<ObjectivePanel />)
      
      const btn = screen.getByTestId('exit-tutorial-btn')
      fireEvent.click(btn)
      
      expect(screen.getByText('确定退出教学？教学进度将丢失')).toBeDefined()
      expect(screen.getByTestId('exit-tutorial-confirm')).toBeDefined()
    })

    it('calls resetToBootPending when confirmed', () => {
      const tutorialWorld: World = {
        ...m1World,
        scenarioId: 'tutorial',
        tutorialState: {
          currentStep: 'panel-tour',
          completedSteps: new Set(),
          startedAt: m1World.date,
          dismissedStepHints: new Set(),
          panelsOpened: new Set(),
          timeoutHintShown: false,
        },
      }
      
      const resetMock = vi.fn()
      useGameStore.setState({ 
        world: tutorialWorld,
        resetToBootPending: resetMock
      })
      
      render(<ObjectivePanel />)
      
      fireEvent.click(screen.getByTestId('exit-tutorial-btn'))
      fireEvent.click(screen.getByTestId('exit-tutorial-confirm'))
      
      expect(resetMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('TopBar', () => {
    it('does not render exit button in M1 scenario', () => {
      useGameStore.setState({ world: m1World })
      render(<TopBar />)
      expect(screen.queryByTestId('topbar-exit-tutorial-btn')).toBeNull()
    })

    it('renders exit button in tutorial scenario', () => {
      const tutorialWorld: World = {
        ...m1World,
        scenarioId: 'tutorial',
      }
      useGameStore.setState({ world: tutorialWorld })
      render(<TopBar />)
      
      expect(screen.getByTestId('topbar-exit-tutorial-btn')).toBeDefined()
    })

    it('shows confirmation dialog when clicked', () => {
      const tutorialWorld: World = {
        ...m1World,
        scenarioId: 'tutorial',
      }
      useGameStore.setState({ world: tutorialWorld })
      render(<TopBar />)
      
      const btn = screen.getByTestId('topbar-exit-tutorial-btn')
      fireEvent.click(btn)
      
      expect(screen.getByText('确定退出教学？')).toBeDefined()
      expect(screen.getByTestId('topbar-exit-tutorial-confirm')).toBeDefined()
    })

    it('calls resetToBootPending when confirmed', () => {
      const tutorialWorld: World = {
        ...m1World,
        scenarioId: 'tutorial',
      }
      
      const resetMock = vi.fn()
      useGameStore.setState({ 
        world: tutorialWorld,
        resetToBootPending: resetMock
      })
      
      render(<TopBar />)
      
      fireEvent.click(screen.getByTestId('topbar-exit-tutorial-btn'))
      fireEvent.click(screen.getByTestId('topbar-exit-tutorial-confirm'))
      
      expect(resetMock).toHaveBeenCalledTimes(1)
    })
  })
})
