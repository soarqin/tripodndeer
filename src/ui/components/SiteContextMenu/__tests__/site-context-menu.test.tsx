/* eslint-disable max-lines-per-function */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SiteContextMenu } from '../SiteContextMenu'

const mockCloseContextMenu = vi.fn()
const mockIssueOrder = vi.fn()

let mockState: Record<string, unknown> = {}

vi.mock('~/ui/store', () => ({
  useGameStore: (selector: (state: Record<string, unknown>) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockState)
    }
    return mockState[selector as string]
  }
}))

vi.mock('~/ui/store/selectors', () => ({
  selectContextMenu: (state: { contextMenu: unknown }) => state.contextMenu,
  selectIdlePlayerArmies: (state: { idleArmies: unknown }) => state.idleArmies,
  selectPlayerRealm: (state: { playerRealm: unknown }) => state.playerRealm,
}))

vi.mock('~/engine/wars', () => ({
  isAtWar: (wars: { attackerId: string; defenderId: string }[], realmA: string, realmB: string) => {
    return wars.some((w) => 
      (w.attackerId === realmA && w.defenderId === realmB) ||
      (w.attackerId === realmB && w.defenderId === realmA)
    )
  }
}))

describe('SiteContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = {
      contextMenu: null,
      idleArmies: [],
      playerRealm: { id: 'realm_qin' },
      world: {
        sites: new Map(),
        wars: []
      },
      closeContextMenu: mockCloseContextMenu,
      issueOrder: mockIssueOrder
    }
  })

  it('does not render when no contextMenu', () => {
    render(<SiteContextMenu />)
    expect(screen.queryByTestId('site-context-menu')).toBeNull()
  })

  it('renders at correct position', () => {
    mockState.contextMenu = { siteId: 'site_1', x: 100, y: 200 }
    ;(mockState.world as { sites: Map<string, unknown> }).sites.set('site_1', { id: 'site_1', ownerId: 'realm_qin', adjacency: [] })
    
    render(<SiteContextMenu />)
    const menu = screen.getByTestId('site-context-menu')
    expect(menu.style.left).toBe('100px')
    expect(menu.style.top).toBe('200px')
  })

  it('own site shows "驻军详情" disabled', () => {
    mockState.contextMenu = { siteId: 'site_1', x: 100, y: 200 }
    ;(mockState.world as { sites: Map<string, unknown> }).sites.set('site_1', { id: 'site_1', ownerId: 'realm_qin', adjacency: [] })
    
    render(<SiteContextMenu />)
    const button = screen.getByText('驻军详情（未来功能）')
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('enemy site with war shows "派兵攻击" option', () => {
    mockState.contextMenu = { siteId: 'site_2', x: 100, y: 200 }
    ;(mockState.world as { sites: Map<string, unknown> }).sites.set('site_2', { id: 'site_2', ownerId: 'realm_zhao', adjacency: ['site_1'] })
    ;(mockState.world as { sites: Map<string, unknown> }).sites.set('site_1', { id: 'site_1', ownerId: 'realm_qin', adjacency: ['site_2'] })
    mockState.idleArmies = [{ id: 'army_1', location: 'site_1', manpower: 1000 }]
    ;(mockState.world as { wars: unknown[] }).wars = [{ attackerId: 'realm_qin', defenderId: 'realm_zhao' }]
    
    render(<SiteContextMenu />)
    expect(screen.getByTestId('menu-march')).toBeTruthy()
    const armyBtn = screen.getByTestId('menu-army-army_1')
    expect(armyBtn.textContent).toBe('army_1 (1,000)')
    
    fireEvent.click(armyBtn)
    expect(mockIssueOrder).toHaveBeenCalledWith({ type: 'march', armyId: 'army_1', targetSiteId: 'site_2' })
    expect(mockCloseContextMenu).toHaveBeenCalled()
  })

  it('shows 宣战 button for enemy site not at war', () => {
    mockState.contextMenu = { siteId: 'site_2', x: 100, y: 200 }
    ;(mockState.world as { sites: Map<string, unknown> }).sites.set('site_2', { id: 'site_2', ownerId: 'realm_zhao', adjacency: ['site_1'] })
    ;(mockState.world as { sites: Map<string, unknown> }).sites.set('site_1', { id: 'site_1', ownerId: 'realm_qin', adjacency: ['site_2'] })
    mockState.idleArmies = [{ id: 'army_1', location: 'site_1', manpower: 1000 }]
    ;(mockState.world as { wars: unknown[] }).wars = []
    
    render(<SiteContextMenu />)
    const declareWarBtn = screen.getByTestId('menu-declare-war-btn')
    expect(declareWarBtn).toBeTruthy()
    expect(declareWarBtn.textContent).toBe('宣战')
  })

  it('clicking casus belli dispatches declare-war order', () => {
    mockState.contextMenu = { siteId: 'site_2', x: 100, y: 200 }
    ;(mockState.world as { sites: Map<string, unknown> }).sites.set('site_2', { id: 'site_2', ownerId: 'realm_zhao', adjacency: ['site_1'] })
    ;(mockState.world as { sites: Map<string, unknown> }).sites.set('site_1', { id: 'site_1', ownerId: 'realm_qin', adjacency: ['site_2'] })
    mockState.idleArmies = [{ id: 'army_1', location: 'site_1', manpower: 1000 }]
    ;(mockState.world as { wars: unknown[] }).wars = []
    
    render(<SiteContextMenu />)
    
    // Click 宣战
    fireEvent.click(screen.getByTestId('menu-declare-war-btn'))
    
    // Picker should be visible
    expect(screen.getByTestId('casus-belli-picker')).toBeTruthy()
    
    // Click a casus belli (e.g. 复仇)
    const revengeBtn = screen.getByText('复仇')
    fireEvent.click(revengeBtn)
    
    expect(mockIssueOrder).toHaveBeenCalledWith({
      type: 'declare-war',
      targetRealmId: 'realm_zhao',
      casusBelli: 'revenge'
    })
    expect(mockCloseContextMenu).toHaveBeenCalled()
  })
})
