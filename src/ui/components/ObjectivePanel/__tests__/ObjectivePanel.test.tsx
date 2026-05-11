import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ObjectivePanel } from '../ObjectivePanel'
import { useGameStore } from '~/ui/store'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import type { World } from '~/shared'

describe('ObjectivePanel', () => {
  let m1World: World

  beforeEach(async () => {
    const m1Data = await loadM1Data()
    m1World = createWorldFromM1Data(m1Data, 42, 'realm_qin')
  })

  it('does not render when scenarioId is not tutorial', () => {
    useGameStore.setState({ world: m1World })
    render(<ObjectivePanel />)
    expect(screen.queryByTestId('objective-panel')).toBeNull()
  })

  it('renders when scenarioId is tutorial and tutorialState exists', () => {
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
    
    expect(screen.getByTestId('objective-panel')).toBeDefined()
    expect(screen.getByText('教学步骤')).toBeDefined()
    expect(screen.getByText('0/5')).toBeDefined()
  })

  it('shows 5 step items with correct status', () => {
    const tutorialWorld: World = {
      ...m1World,
      scenarioId: 'tutorial',
      tutorialState: {
        currentStep: 'diplomacy-ju',
        completedSteps: new Set(['panel-tour']),
        startedAt: m1World.date,
        dismissedStepHints: new Set(),
        panelsOpened: new Set(),
        timeoutHintShown: false,
      },
    }
    useGameStore.setState({ world: tutorialWorld })
    render(<ObjectivePanel />)
    
    expect(screen.getByText('1/5')).toBeDefined()
    
    expect(screen.getByText('先观势力面板')).toBeDefined()
    expect(screen.getByText('外交接触苴侯')).toBeDefined()
    expect(screen.getByText('宣战并进军蜀境')).toBeDefined()
    
    expect(screen.getByText('✓')).toBeDefined()
    expect(screen.getByText('▶')).toBeDefined()
    expect(screen.getAllByText('○').length).toBe(3)
  })

  it('can collapse and expand', () => {
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
    
    expect(screen.getByTestId('objective-panel-collapse')).toBeDefined()
    expect(screen.queryByTestId('objective-panel-expand')).toBeNull()
    expect(screen.getByText('先观势力面板')).toBeDefined()
    
    fireEvent.click(screen.getByTestId('objective-panel-collapse'))
    
    expect(screen.queryByTestId('objective-panel-collapse')).toBeNull()
    expect(screen.getByTestId('objective-panel-expand')).toBeDefined()
    expect(screen.queryByText('先观势力面板')).toBeNull()
    
    fireEvent.click(screen.getByTestId('objective-panel-expand'))
    
    expect(screen.getByTestId('objective-panel-collapse')).toBeDefined()
    expect(screen.getByText('先观势力面板')).toBeDefined()
  })
})
