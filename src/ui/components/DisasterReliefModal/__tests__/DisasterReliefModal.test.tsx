import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DisasterReliefModal } from '../DisasterReliefModal'
import { useGameStore } from '~/ui/store/game-store'
import type { GameStoreState } from '~/ui/store/game-store'
import type { ModalAction } from '~/ui/components/Modal/Modal'
import type { DisasterState, Site } from '~/shared/types'

vi.mock('~/ui/store/game-store', () => ({
  useGameStore: vi.fn(),
}))

describe('DisasterReliefModal', () => {
  const mockOpenModal = vi.fn()
  const mockApplyDisasterChoice = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not open modal when no disaster', () => {
    vi.mocked(useGameStore).mockImplementation((selector) => {
      const state = {
        world: {
          playerRealmId: 'realm_qin',
          disasterStates: new Map(),
          sites: new Map(),
        },
        openModal: mockOpenModal,
        applyDisasterChoice: mockApplyDisasterChoice,
      }
      return selector(state as unknown as GameStoreState)
    })

    render(<DisasterReliefModal />)
    expect(mockOpenModal).not.toHaveBeenCalled()
  })

  it('does not open modal when disaster is resolved', () => {
    const disasterState: DisasterState = {
      realmId: 'realm_qin',
      disasterId: 'disaster_da_shui',
      siteId: 'site_xianyang',
      startedAtTick: 10,
      status: 'resolved',
      chosenChoiceId: 'open_granary',
      resolvedAtTick: 15,
    }

    vi.mocked(useGameStore).mockImplementation((selector) => {
      const state = {
        world: {
          playerRealmId: 'realm_qin',
          disasterStates: new Map([['realm_qin', disasterState]]),
          sites: new Map(),
        },
        openModal: mockOpenModal,
        applyDisasterChoice: mockApplyDisasterChoice,
      }
      return selector(state as unknown as GameStoreState)
    })

    render(<DisasterReliefModal />)
    expect(mockOpenModal).not.toHaveBeenCalled()
  })

  it('opens modal when disaster is awaiting_decision', () => {
    const disasterState: DisasterState = {
      realmId: 'realm_qin',
      disasterId: 'disaster_da_shui',
      siteId: 'site_xianyang',
      startedAtTick: 10,
      status: 'awaiting_decision',
    }

    const site: Site = {
      id: 'site_xianyang',
      name: '咸阳',
      position: [0, 0],
      boundary: [],
      ownerId: 'realm_qin',
      polygon: [],
      adjacency: [],
      economy: {
        population: 10000,
        households: 2000,
        taxBase: 100,
        foodProduction: 100,
      },
    }

    vi.mocked(useGameStore).mockImplementation((selector) => {
      const state = {
        world: {
          playerRealmId: 'realm_qin',
          disasterStates: new Map([['realm_qin', disasterState]]),
          sites: new Map([['site_xianyang', site]]),
        },
        openModal: mockOpenModal,
        applyDisasterChoice: mockApplyDisasterChoice,
      }
      return selector(state as unknown as GameStoreState)
    })

    render(<DisasterReliefModal />)
    
    expect(mockOpenModal).toHaveBeenCalledTimes(1)
    const modalArgs = mockOpenModal.mock.calls[0][0]
    
    expect(modalArgs.title).toBe('咸阳 发生 大水')
    expect(modalArgs.dismissable).toBe(false)
    expect(modalArgs.testId).toBe('disaster-modal')
    expect(modalArgs.actions).toHaveLength(4)
    
    const actionIds = modalArgs.actions.map((a: ModalAction) => a.id)
    expect(actionIds).toContain('open_granary')
    expect(actionIds).toContain('reduce_tax')
    expect(actionIds).toContain('forced_levy')
    expect(actionIds).toContain('ignore')

    const openGranaryAction = modalArgs.actions.find((a: ModalAction) => a.id === 'open_granary')
    openGranaryAction.onClick()
    
    expect(mockApplyDisasterChoice).toHaveBeenCalledWith('disaster_da_shui', 'open_granary')
  })
})
