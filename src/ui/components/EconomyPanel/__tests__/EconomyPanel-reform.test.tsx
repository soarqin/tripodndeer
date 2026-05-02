import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EconomyPanel } from '../EconomyPanel'
import { useGameStore } from '~/ui/store'

vi.mock('~/ui/store', () => ({
  useGameStore: vi.fn(),
}))

vi.mock('~/ui/store/selectors', () => ({
  selectActivePanel: () => 'neizheng',
  selectPlayerTreasury: () => 1000,
  selectPlayerFoodStores: () => 1000,
  selectPlayerTaxRate: () => 10,
  selectPlayerMonthlyEconomyDeltas: () => ({ treasuryDelta: 0, foodStoresDelta: 0, populationDelta: 0, householdsDelta: 0 }),
  selectPlayerOwnedSiteEconomyTotals: () => ({ population: 10000, households: 2000 }),
  selectPlayerActiveEdicts: () => [],
  selectPlayerGovernorAssignments: () => [],
  selectPlayerActiveReform: vi.fn(),
  selectPlayerReformTraits: vi.fn(),
  selectPlayerPoliticalSystem: vi.fn(),
  useSites: () => new Map(),
  useGenerals: () => new Map(),
}))

import * as selectors from '~/ui/store/selectors'

describe('EconomyPanel - Reform Section', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useGameStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          playerRealmId: 'realm_qin',
          world: { tick: 0, pendingOrders: [] },
        })
      }
      return selector
    })
  })

  it('shows political system label', () => {
    vi.mocked(selectors.selectPlayerPoliticalSystem).mockReturnValue('legalist_centralized')
    vi.mocked(selectors.selectPlayerReformTraits).mockReturnValue([])
    vi.mocked(selectors.selectPlayerActiveReform).mockReturnValue(null)

    render(<EconomyPanel />)
    
    expect(screen.getByTestId('political-system-display').textContent).toContain('法家集权')
  })

  it('shows reform traits', () => {
    vi.mocked(selectors.selectPlayerPoliticalSystem).mockReturnValue('enfeoffment')
    vi.mocked(selectors.selectPlayerReformTraits).mockReturnValue(['shang_yang_reform_done', 'unknown_trait'])
    vi.mocked(selectors.selectPlayerActiveReform).mockReturnValue(null)

    render(<EconomyPanel />)
    
    const traitList = screen.getByTestId('reform-trait-list')
    expect(traitList.textContent).toContain('商鞅变法')
    expect(traitList.textContent).toContain('unknown_trait')
  })

  it('shows active reform when present', () => {
    vi.mocked(selectors.selectPlayerPoliticalSystem).mockReturnValue('enfeoffment')
    vi.mocked(selectors.selectPlayerReformTraits).mockReturnValue([])
    vi.mocked(selectors.selectPlayerActiveReform).mockReturnValue({
      realmId: 'realm_qin',
      reformId: 'shang_yang_reform',
      currentStageId: 'stage_1',
      startedAtTick: 0,
      stageEnteredAtTick: 0,
      status: 'in_progress',
      choiceHistory: [],
    })

    render(<EconomyPanel />)
    
    expect(screen.getByText('进行中')).toBeDefined()
    expect(screen.getByText('shang_yang_reform')).toBeDefined()
  })
})
