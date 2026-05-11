import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RealmOverviewPanel } from './RealmOverviewPanel'
import type { Army, Realm, Site, WarState, World } from '~/shared/types'

let mockActivePanel: 'wanggong' | 'junshi' | null = 'wanggong'
let mockRealm: Realm | null = null
let mockArmies: Army[] = []
let mockWorld: Partial<World> = {}

vi.mock('~/ui/store', () => ({
  useGameStore: (selector: (state: { world: Partial<World> }) => unknown) => {
    if (typeof selector === 'function') {
      const state = {
        world: mockWorld
      }
      try {
        return selector(state)
      } catch (e) {
        // Ignore
      }
    }
    return undefined
  }
}))

vi.mock('~/ui/store/selectors', () => ({
  selectActivePanel: () => mockActivePanel,
  selectPlayerRealm: () => mockRealm,
  selectAllPlayerArmies: () => mockArmies,
}))

describe('RealmOverviewPanel', () => {
  beforeEach(() => {
    mockActivePanel = 'wanggong'
    
    mockRealm = {
      id: 'r1',
      displayName: '魏',
      fullTitle: '魏王',
      color: '#ff0000',
      capital: 's1',
      initialSites: [],
      initialArmies: [],
      economy: { treasury: 0, foodStores: 0, taxRate: 10 },
      traits: [],
      politicalSystem: 'enfeoffment',
    }

    const site1: Site = { id: 's1', name: '许昌', position: [0, 0], ownerId: 'r1', polygon: [], adjacency: [], boundary: [], economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 } }
    const site2: Site = { id: 's2', name: '洛阳', position: [0, 0], ownerId: 'r1', polygon: [], adjacency: [], boundary: [], economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 } }
    const site3: Site = { id: 's3', name: '建业', position: [0, 0], ownerId: 'r2', polygon: [], adjacency: [], boundary: [], economy: { population: 0, households: 0, taxBase: 0, foodProduction: 0 } }

    mockArmies = [
      { id: 'a1', realmId: 'r1', manpower: 10000, state: 'idle', location: 's1', destination: null, ticksRemaining: 0, source: null },
      { id: 'a2', realmId: 'r1', manpower: 5000, state: 'marching', location: 's1', destination: 's2', ticksRemaining: 10, source: 's1' }
    ]

    const sampleWar: WarState = {
      casusBelli: null,
      declaredAt: { yearBC: 260, season: 'spring', month: 1, xun: 'shang' },
      occupiedSites: new Map(),
      peaceProposalId: null,
    }
    mockWorld = {
      sites: new Map([['s1', site1], ['s2', site2], ['s3', site3]]),
      wars: new Map([['r1:r2', sampleWar]]),
      generals: new Map(),
      passes: new Map(),
      adjacencyEdges: new Map(),
      rulers: new Map(),
      scenarioId: 'm1',
      tutorialState: null,
    }
  })

  it('renders when activePanel is wanggong', () => {
    render(<RealmOverviewPanel />)
    expect(screen.getByTestId('realm-overview-panel')).toBeTruthy()
  })

  it('does not render when activePanel is not wanggong', () => {
    mockActivePanel = null
    render(<RealmOverviewPanel />)
    expect(screen.queryByTestId('realm-overview-panel')).toBeNull()
  })

  it('displays correct realm name and title', () => {
    render(<RealmOverviewPanel />)
    expect(screen.getByTestId('realm-name').textContent).toContain('魏 · 魏王')
  })

  it('displays correct site count', () => {
    render(<RealmOverviewPanel />)
    expect(screen.getByTestId('realm-sites-count').textContent).toContain('2 / 3')
  })

  it('displays correct total manpower', () => {
    render(<RealmOverviewPanel />)
    expect(screen.getByTestId('realm-total-manpower').textContent).toContain('15,000')
  })

  it('displays correct army states and war count', () => {
    render(<RealmOverviewPanel />)
    expect(screen.getByText('闲1 行1 退0')).toBeTruthy()
    expect(screen.getByText('1 国')).toBeTruthy()
  })
})
