import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { EconomyPanel } from '../EconomyPanel'

const mockActivatePlayerEdict = vi.fn()
const mockAssignPlayerGovernor = vi.fn()

vi.mock('~/ui/store', () => ({
  useGameStore: vi.fn((selector) => {
    const state = {
      activePanel: 'neizheng',
      playerRealmId: 'realm_qin',
      world: { tick: 42, pendingOrders: [{ type: 'march' }, { type: 'march' }] },
      activatePlayerEdict: mockActivatePlayerEdict,
      assignPlayerGovernor: mockAssignPlayerGovernor,
    }
    return selector(state)
  }),
}))

interface MockState {
  activePanel: string
}

vi.mock('~/ui/store/selectors', () => ({
  selectActivePanel: (state: MockState) => state.activePanel,
  selectPlayerTreasury: () => 1000,
  selectPlayerFoodStores: () => 5000,
  selectPlayerTaxRate: () => 20,
  selectPlayerMonthlyEconomyDeltas: () => ({
    treasuryDelta: 100,
    foodStoresDelta: -50,
    populationDelta: 10,
    householdsDelta: 2,
  }),
  selectPlayerOwnedSiteEconomyTotals: () => ({
    population: 10000,
    households: 2000,
  }),
  selectPlayerActiveEdicts: () => [
    { id: 'edict_1', kind: 'edict_tax_relief', remainingMonths: 2 }
  ],
  selectPlayerGovernorAssignments: () => [
    { siteId: 'site_1', generalId: 'gen_1' }
  ],
  useSites: () => new Map([
    ['site_1', { id: 'site_1', name: '咸阳', ownerId: 'realm_qin', economy: { population: 5000, households: 1000 } }],
    ['site_2', { id: 'site_2', name: '雍', ownerId: 'realm_qin', economy: { population: 5000, households: 1000 } }],
    ['site_3', { id: 'site_3', name: '洛阳', ownerId: 'realm_zhou', economy: { population: 5000, households: 1000 } }],
  ]),
  useGenerals: () => new Map([
    ['gen_1', { id: 'gen_1', name: '白起', realmId: 'realm_qin' }],
    ['gen_2', { id: 'gen_2', name: '王翦', realmId: 'realm_qin' }],
    ['gen_3', { id: 'gen_3', name: '李牧', realmId: 'realm_zhao' }],
  ]),
}))

describe('EconomyPanel', () => {
  beforeEach(() => {
    mockActivatePlayerEdict.mockClear()
    mockAssignPlayerGovernor.mockClear()
  })

  it('renders economy summary correctly', () => {
    const { getByText } = render(<EconomyPanel />)
    
    expect(getByText('M4 Economy')).toBeTruthy()
    expect(getByText('1,000')).toBeTruthy() // Treasury
    expect(getByText('5,000')).toBeTruthy() // Food Stores
    expect(getByText('20%')).toBeTruthy() // Tax Rate
    expect(getByText('+100')).toBeTruthy() // Treasury Delta
    expect(getByText('-50')).toBeTruthy() // Food Delta
    expect(getByText('10,000')).toBeTruthy() // Population
    expect(getByText('2,000')).toBeTruthy() // Households
  })

  it('renders active edicts', () => {
    const { getByText } = render(<EconomyPanel />)
    expect(getByText('免税')).toBeTruthy()
    expect(getByText('剩余 2 月')).toBeTruthy()
  })

  it('calls activatePlayerEdict when clicking edict buttons with deterministic IDs', () => {
    const { getByRole } = render(<EconomyPanel />)
    
    fireEvent.click(getByRole('button', { name: 'Activate Tax Relief' }))
    expect(mockActivatePlayerEdict).toHaveBeenCalledWith(expect.objectContaining({
      edictId: 'edict_42_tax_1_2', // tick 42, 1 active edict, 2 pending orders
      kind: 'edict_tax_relief',
      durationMonths: 3,
    }))

    fireEvent.click(getByRole('button', { name: 'Activate Grain Reserve' }))
    expect(mockActivatePlayerEdict).toHaveBeenCalledWith(expect.objectContaining({
      edictId: 'edict_42_grain_1_2', // tick 42, 1 active edict, 2 pending orders
      kind: 'edict_grain_reserve',
      durationMonths: 3,
    }))
  })

  it('renders owned sites and governors', () => {
    const { getAllByText, queryByText } = render(<EconomyPanel />)
    
    expect(getAllByText('咸阳').length).toBeGreaterThan(0)
    expect(getAllByText('太守: 白起').length).toBeGreaterThan(0)
    
    expect(getAllByText('雍').length).toBeGreaterThan(0)
    expect(getAllByText('无太守').length).toBeGreaterThan(0)
    
    expect(queryByText('洛阳')).toBeNull() // Not owned
  })

  it('assigns governor when valid selection is made', () => {
    const { getByRole, getByLabelText } = render(<EconomyPanel />)
    
    const siteSelect = getByLabelText('Select Site')
    const generalSelect = getByLabelText('Select General')
    const assignBtn = getByRole('button', { name: 'Assign Governor' })
    
    expect(assignBtn).toHaveProperty('disabled', true)
    
    fireEvent.change(siteSelect, { target: { value: 'site_2' } })
    fireEvent.change(generalSelect, { target: { value: 'gen_2' } })
    
    expect(assignBtn).toHaveProperty('disabled', false)
    
    fireEvent.click(assignBtn)
    
    expect(mockAssignPlayerGovernor).toHaveBeenCalledWith({
      siteId: 'site_2',
      generalId: 'gen_2',
    })
  })

  it('does not call assignPlayerGovernor when clicking disabled Assign Governor button', () => {
    const { getByRole } = render(<EconomyPanel />)
    const assignBtn = getByRole('button', { name: 'Assign Governor' })
    
    expect(assignBtn).toHaveProperty('disabled', true)
    fireEvent.click(assignBtn)
    
    expect(mockAssignPlayerGovernor).not.toHaveBeenCalled()
  })
})
