import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TradePanelView } from '../TradePanelView'
import type { TradeRoute } from '~/shared/types'
import type { GameStoreState } from '~/ui/store/game-store'

interface MockWorld {
  playerRealmId: string
  tradeRoutes: Map<string, TradeRoute>
}

let mockWorld: MockWorld | null = null

vi.mock('~/ui/store/game-store', () => ({
  useGameStore: (selector: (state: GameStoreState) => unknown) => {
    return selector({ world: mockWorld } as unknown as GameStoreState)
  }
}))

describe('TradePanelView', () => {
  beforeEach(() => {
    mockWorld = {
      playerRealmId: 'realm_qin',
      tradeRoutes: new Map<string, TradeRoute>()
    }
  })

  it('renders nothing if world is null', () => {
    mockWorld = null
    const { container } = render(<TradePanelView />)
    expect(container.firstChild).toBeNull()
  })

  it('renders trade panel with establish button', () => {
    render(<TradePanelView />)
    expect(screen.getByTestId('trade-panel')).toBeTruthy()
    expect(screen.getByTestId('trade-establish-btn')).toBeTruthy()
    expect(screen.getByText('商路')).toBeTruthy()
  })

  it('shows active routes for player', () => {
    mockWorld!.tradeRoutes.set('route_1', {
      id: 'route_1',
      fromSiteId: 'site_a',
      toSiteId: 'site_b',
      fromRealmId: 'realm_qin',
      toRealmId: 'realm_zhao',
      establishedAtTick: 0,
      baseIncomePerXun: 100,
      status: 'active'
    })

    render(<TradePanelView />)
    
    const route = screen.getByTestId('trade-route-route_1')
    expect(route).toBeTruthy()
    expect(route.textContent).toContain('site_a ↔ site_b')
    expect(route.textContent).toContain('100/旬')
  })

  it('shows cut routes with different styling', () => {
    mockWorld!.tradeRoutes.set('route_2', {
      id: 'route_2',
      fromSiteId: 'site_c',
      toSiteId: 'site_d',
      fromRealmId: 'realm_zhao',
      toRealmId: 'realm_qin',
      establishedAtTick: 0,
      baseIncomePerXun: 100,
      status: 'cut'
    })

    render(<TradePanelView />)
    
    expect(screen.getByText('已断商路')).toBeTruthy()
    const route = screen.getByTestId('trade-route-route_2')
    expect(route).toBeTruthy()
    expect(route.textContent).toContain('site_c ↔ site_d')
    expect(route.textContent).toContain('已断')
    expect(route.style.opacity).toBe('0.5')
  })

  it('does not show routes not involving player', () => {
    mockWorld!.tradeRoutes.set('route_3', {
      id: 'route_3',
      fromSiteId: 'site_e',
      toSiteId: 'site_f',
      fromRealmId: 'realm_zhao',
      toRealmId: 'realm_wei',
      establishedAtTick: 0,
      baseIncomePerXun: 100,
      status: 'active'
    })

    render(<TradePanelView />)
    
    expect(screen.queryByTestId('trade-route-route_3')).toBeNull()
  })
})
