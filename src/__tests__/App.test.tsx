// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { App } from '../App'
import { useGameStore } from '~/ui/store'
import type { World } from '~/shared/types'

describe('App', () => {
  beforeEach(() => {
    useGameStore.setState({
      bootStatus: 'ready',
      world: {
        realms: new Map(),
        sites: new Map(),
        generals: new Map(),
        characterTemplates: new Map(),
        armies: new Map(),
        edicts: new Map(),
        governorAssignments: new Map(),
        treaties: new Map(),
        relations: new Map(),
        diplomaticProposals: new Map(),
        coalitions: new Map(),
        zhouInvestiture: new Map(),
        disasterStates: new Map(),
        reformStates: new Map(),
        eventChainStates: new Map(),
        tradeRoutes: new Map(),
        factionInfluences: new Map(),
        passes: new Map(),
        adjacencyEdges: new Map(),
        sieges: new Map(),
        intelligenceCoverage: new Map(),
        spyMissions: new Map(),
        counterIntelStates: new Map(),
        provinces: new Map(),
        regions: new Map(),
        localization: new Map(),
        pendingOrders: [],
        phases: [],
        rngState: { seed: 0, counter: 0 },
        date: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
        tick: 0,
        playerRealmId: 'realm_qin',
      } as unknown as World,
      modalQueue: [],
    })
  })

  it('renders back-to-menu button when bootStatus is ready', () => {
    render(<App />)
    expect(screen.getByTestId('back-to-menu-btn')).toBeDefined()
  })

  it('clicking back-to-menu triggers confirmation modal and resets to boot pending on confirm', () => {
    render(<App />)
    
    const backBtn = screen.getByTestId('back-to-menu-btn')
    fireEvent.click(backBtn)
    
    const modalQueue = useGameStore.getState().modalQueue
    expect(modalQueue).toHaveLength(1)
    expect(modalQueue[0]?.title).toBe('返回主菜单')
    
    const confirmAction = modalQueue[0]?.actions.find(a => a.id === 'confirm')
    expect(confirmAction).toBeDefined()
    
    confirmAction?.onClick()
    
    expect(useGameStore.getState().bootStatus).toBe('pending')
  })
})
