/* eslint-disable max-lines-per-function */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArmyListPanel } from '../ArmyListPanel'
import type { Army, General } from '~/shared/types'

const mockSelectArmy = vi.fn()
let mockActivePanel: 'wanggong' | 'junshi' | null = 'junshi'
let mockArmies: Army[] = []
let mockSelectedArmy: Army | null = null
let mockGenerals: Map<string, General> = new Map()

vi.mock('~/ui/store', () => ({
  useGameStore: (selector: (state: { selectArmy: typeof mockSelectArmy }) => unknown) => {
    // We need to handle both direct state selectors and the state => state.selectArmy pattern
    if (typeof selector === 'function') {
      const state = {
        selectArmy: mockSelectArmy,
      }
      try {
        return selector(state)
      } catch (e) {
        // If it throws, it's likely one of our mocked selectors from selectors.ts
        // We'll handle those in the selectors mock below
      }
    }
    return undefined
  }
}))

vi.mock('~/ui/store/selectors', () => ({
  selectActivePanel: () => mockActivePanel,
  selectAllPlayerArmies: () => mockArmies,
  selectSelectedArmy: () => mockSelectedArmy,
  useGenerals: () => mockGenerals,
}))

describe('ArmyListPanel', () => {
  beforeEach(() => {
    mockSelectArmy.mockClear()
    mockActivePanel = 'junshi'
    mockArmies = []
    mockSelectedArmy = null
    mockGenerals = new Map()
  })

  it('does not render when activePanel !== "junshi"', () => {
    mockActivePanel = 'wanggong'
    render(<ArmyListPanel />)
    expect(screen.queryByTestId('army-list-panel')).toBeNull()
  })

  it('renders when activePanel === "junshi"', () => {
    render(<ArmyListPanel />)
    expect(screen.getByTestId('army-list-panel')).toBeTruthy()
    expect(screen.getByText('军事')).toBeTruthy()
    expect(screen.getByText('无军团')).toBeTruthy()
  })

  it('shows player armies', () => {
    mockArmies = [
      {
        id: 'army_1',
        realmId: 'realm_qin',
        location: 'site_1',
        manpower: 1000,
        state: 'idle',
        destination: null,
        ticksRemaining: 0,
        source: null,
      },
      {
        id: 'army_2',
        realmId: 'realm_qin',
        location: 'site_2',
        manpower: 2000,
        state: 'marching',
        destination: 'site_3',
        ticksRemaining: 5,
        source: 'site_2',
      }
    ]
    render(<ArmyListPanel />)
    
    expect(screen.queryByText('无军团')).toBeNull()
    
    const row1 = screen.getByTestId('army-row-army_1')
    expect(row1).toBeTruthy()
    expect(row1.textContent).toContain('army_1')
    expect(row1.textContent).toContain('site_1')
    expect(row1.textContent).toContain('1,000')
    expect(row1.textContent).toContain('idle')
    
    const row2 = screen.getByTestId('army-row-army_2')
    expect(row2).toBeTruthy()
    expect(row2.textContent).toContain('army_2')
    expect(row2.textContent).toContain('site_2')
    expect(row2.textContent).toContain('2,000')
    expect(row2.textContent).toContain('marching')
    expect(row2.textContent).toContain('→ site_3')
    expect(row2.textContent).toContain('5旬')
  })

  it('click on army row calls selectArmy with correct armyId', () => {
    mockArmies = [
      {
        id: 'army_1',
        realmId: 'realm_qin',
        location: 'site_1',
        manpower: 1000,
        state: 'idle',
        destination: null,
        ticksRemaining: 0,
        source: null,
      }
    ]
    render(<ArmyListPanel />)
    
    const row = screen.getByTestId('army-row-army_1')
    fireEvent.click(row)
    
    expect(mockSelectArmy).toHaveBeenCalledWith('army_1')
  })

  it('army with general renders general name and attributes', () => {
    mockGenerals.set('gen_1', {
      id: 'gen_1',
      realmId: 'realm_qin',
      name: '白起',
      might: 90,
      command: 95,
      loyalty: 100,
    })
    
    mockArmies = [
      {
        id: 'army_1',
        realmId: 'realm_qin',
        location: 'site_1',
        manpower: 1000,
        state: 'idle',
        destination: null,
        ticksRemaining: 0,
        source: null,
        generalId: 'gen_1',
      }
    ]
    render(<ArmyListPanel />)
    
    const row = screen.getByTestId('army-row-army_1')
    expect(row.textContent).toContain('将领: 白起 (武:90 统:95)')
  })

  it('army with composition renders composition info', () => {
    mockArmies = [
      {
        id: 'army_1',
        realmId: 'realm_qin',
        location: 'site_1',
        manpower: 1000,
        state: 'idle',
        destination: null,
        ticksRemaining: 0,
        source: null,
        composition: {
          infantry: 500,
          chariot: 100,
          cavalry: 0,
          crossbow: 400,
        }
      }
    ]
    render(<ArmyListPanel />)
    
    const row = screen.getByTestId('army-row-army_1')
    expect(row.textContent).toContain('步:500 车:100 弩:400')
    expect(row.textContent).not.toContain('骑:0')
  })
})
