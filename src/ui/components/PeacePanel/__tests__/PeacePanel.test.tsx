/* eslint-disable max-lines-per-function */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeacePanel } from '../PeacePanel'
import { useGameStore } from '~/ui/store'
import type { World, Realm, Site } from '~/shared/types'

// Mock the store
vi.mock('~/ui/store', () => ({
  useGameStore: vi.fn()
}))

describe('PeacePanel', () => {
  const mockIssueOrder = vi.fn()
  const mockOnClose = vi.fn()

  const mockPlayerRealm: Realm = {
    id: 'realm_qin',
    displayName: 'Qin',
    fullTitle: 'State of Qin',
    color: '#000',
    capital: 'site_1',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random'
  }

  const mockTargetRealm: Realm = {
    id: 'realm_zhao',
    displayName: 'Zhao',
    fullTitle: 'State of Zhao',
    color: '#f00',
    capital: 'site_2',
    initialSites: [],
    initialArmies: [],
    aiPersonality: 'aggressive_random',
    stats: {
      manpowerPool: 1000,
      manpowerCap: 1000,
      warWeariness: 10
    }
  }

  const mockWorld = {
    date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
    realms: new Map([
      ['realm_qin', mockPlayerRealm],
      ['realm_zhao', mockTargetRealm]
    ]),
    sites: new Map<string, Site>(),
    generals: new Map()
  } as unknown as World

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default store mock implementation
    ;(useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        // Handle selectors
        if (selector.name === 'selectPlayerRealm' || selector.toString().includes('playerRealmId')) {
          return mockPlayerRealm
        }
        return selector({
          world: mockWorld,
          playerRealmId: 'realm_qin',
          issueOrder: mockIssueOrder
        })
      }
      return {
        world: mockWorld,
        playerRealmId: 'realm_qin',
        issueOrder: mockIssueOrder
      }
    })
  })

  it('renders with no occupied sites (empty cession list)', () => {
    render(<PeacePanel targetRealmId="realm_zhao" onClose={mockOnClose} />)
    
    expect(screen.getByText('向 Zhao 提议和平')).toBeTruthy()
    expect(screen.getByText('没有占领的邑')).toBeTruthy()
    expect(screen.getByTestId('indemnity-input')).toBeTruthy()
    expect(screen.getByTestId('tribute-amount-input')).toBeTruthy()
    expect(screen.getByTestId('tribute-years-input')).toBeTruthy()
  })

  it('shows occupied sites and allows selection', () => {
    const worldWithSites = {
      ...mockWorld,
      sites: new Map<string, Site>([
        ['site_1', { id: 'site_1', name: 'Handan', ownerId: 'realm_zhao', occupation: { occupierId: 'realm_qin', controlLevel: 100 } } as Site],
        ['site_2', { id: 'site_2', name: 'Jinyang', ownerId: 'realm_zhao', occupation: { occupierId: 'realm_qin', controlLevel: 100 } } as Site],
        ['site_3', { id: 'site_3', name: 'Anyang', ownerId: 'realm_zhao' } as Site] // Not occupied
      ])
    } as unknown as World

    ;(useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        if (selector.name === 'selectPlayerRealm' || selector.toString().includes('playerRealmId')) {
          return mockPlayerRealm
        }
        return selector({ world: worldWithSites, playerRealmId: 'realm_qin', issueOrder: mockIssueOrder })
      }
      return { world: worldWithSites, playerRealmId: 'realm_qin', issueOrder: mockIssueOrder }
    })

    render(<PeacePanel targetRealmId="realm_zhao" onClose={mockOnClose} />)
    
    expect(screen.getByText('Handan')).toBeTruthy()
    expect(screen.getByText('Jinyang')).toBeTruthy()
    expect(screen.queryByText('Anyang')).toBeNull()

    const checkbox1 = screen.getByTestId('cession-site-site_1') as HTMLInputElement
    expect(checkbox1.checked).toBe(false)
    
    fireEvent.click(checkbox1)
    expect(checkbox1.checked).toBe(true)
  })

  it('submit button dispatches proposePeace order', () => {
    render(<PeacePanel targetRealmId="realm_zhao" onClose={mockOnClose} />)
    
    // Set indemnity
    fireEvent.change(screen.getByTestId('indemnity-input'), { target: { value: '500' } })
    
    // Set tribute
    fireEvent.change(screen.getByTestId('tribute-amount-input'), { target: { value: '100' } })
    fireEvent.change(screen.getByTestId('tribute-years-input'), { target: { value: '5' } })
    
    // Submit
    fireEvent.click(screen.getByTestId('submit-btn'))
    
    expect(mockIssueOrder).toHaveBeenCalledWith(expect.objectContaining({
      type: 'propose-peace',
      peaceProposalData: expect.objectContaining({
        proposingRealmId: 'realm_qin',
        targetRealmId: 'realm_zhao',
        terms: expect.arrayContaining([
          { type: 'indemnity', payload: { amount: 500 } },
          { type: 'tribute', payload: { amountPerYear: 100, years: 5 } }
        ])
      })
    }))
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('acceptance score displays', () => {
    render(<PeacePanel targetRealmId="realm_zhao" onClose={mockOnClose} />)
    
    // Score calculation:
    // occupiedCount = 0 -> 0 * 30 = 0
    // warWeariness = 10 -> 10 * 0.5 = 5
    // targetGenerals = 0 -> 0 * 5 = 0
    // Total = 5
    
    const scoreElement = screen.getByTestId('acceptance-score')
    expect(scoreElement.textContent).toContain('5.0')
  })
})
