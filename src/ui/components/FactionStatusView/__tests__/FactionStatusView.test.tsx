import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FactionStatusView } from '../FactionStatusView'
import { useGameStore } from '~/ui/store/game-store'
import type { FactionId, FactionInfluenceState } from '~/shared/types'

vi.mock('~/ui/store/game-store', () => ({
  useGameStore: vi.fn(),
}))

describe('FactionStatusView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state when no faction data', () => {
    vi.mocked(useGameStore).mockImplementation((selector) => {
      const state = {
        world: {
          playerRealmId: 'realm_qin',
          factionInfluences: new Map(),
        },
      }
      return selector(state as any)
    })

    render(<FactionStatusView />)
    
    expect(screen.getByTestId('faction-status')).toBeTruthy()
    expect(screen.getByText('派系数据加载中...')).toBeTruthy()
  })

  it('renders 6 faction bars when data available', () => {
    const influences = new Map<FactionId, number>([
      ['royal_kin', 20],
      ['noble_clans', 15],
      ['military_meritocracy', 30],
      ['reformists', 10],
      ['conservatives', 25],
      ['foreign_clients', 0],
    ])
    
    const factionState: FactionInfluenceState = {
      realmId: 'realm_qin',
      influences,
    }

    vi.mocked(useGameStore).mockImplementation((selector) => {
      const state = {
        world: {
          playerRealmId: 'realm_qin',
          factionInfluences: new Map([['realm_qin', factionState]]),
        },
      }
      return selector(state as any)
    })

    render(<FactionStatusView />)
    
    expect(screen.getByTestId('faction-status')).toBeTruthy()
    expect(screen.getByText('派系势力')).toBeTruthy()
    
    const factionIds = [
      'royal_kin',
      'noble_clans',
      'military_meritocracy',
      'reformists',
      'conservatives',
      'foreign_clients'
    ]
    
    factionIds.forEach(fid => {
      expect(screen.getByTestId(`faction-bar-${fid}`)).toBeTruthy()
    })
    
    expect(screen.getByText('君党')).toBeTruthy()
    expect(screen.getByText('20')).toBeTruthy()
    expect(screen.getByText('军功派')).toBeTruthy()
    expect(screen.getByText('30')).toBeTruthy()
  })
})
