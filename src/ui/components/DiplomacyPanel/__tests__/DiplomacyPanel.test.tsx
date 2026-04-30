import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiplomacyPanel } from '../DiplomacyPanel'

const mockCloseDiplomacyPanel = vi.fn()
const mockSubmitPlayerDiplomacyAction = vi.fn()

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
  selectDiplomacyTargetRealmId: (state: { diplomacyTargetRealmId: unknown }) => state.diplomacyTargetRealmId,
  selectPlayerRealm: (state: { playerRealm: unknown }) => state.playerRealm,
  selectDiplomacyRelationSummaries: (state: { relationSummaries: unknown }) => state.relationSummaries,
  selectDiplomacyFeedback: (state: { feedbackList: unknown }) => state.feedbackList,
  selectCoalitionPressure: (state: { coalitionPressure: unknown }) => state.coalitionPressure,
  selectPlayerZhouInvestiture: (state: { zhouInvestiture: unknown }) => state.zhouInvestiture,
}))

describe('DiplomacyPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = {
      diplomacyTargetRealmId: 'realm_zhao',
      playerRealm: { id: 'realm_qin' },
      relationSummaries: [
        {
          counterpartRealmId: 'realm_zhao',
          counterpartRealmName: '赵国',
          attitude: 10,
          trust: 20,
          atWar: false,
          activeTreatyIds: ['treaty_1'],
          pendingProposalIds: [],
          hasActiveTruce: true,
        }
      ],
      feedbackList: [],
      coalitionPressure: [],
      zhouInvestiture: null,
      closeDiplomacyPanel: mockCloseDiplomacyPanel,
      submitPlayerDiplomacyAction: mockSubmitPlayerDiplomacyAction
    }
  })

  it('does not render when no targetRealmId', () => {
    mockState.diplomacyTargetRealmId = null
    render(<DiplomacyPanel />)
    expect(screen.queryByTestId('diplomacy-panel')).toBeNull()
  })

  it('renders relation summary correctly', () => {
    render(<DiplomacyPanel />)
    expect(screen.getByTestId('diplomacy-panel')).toBeTruthy()
    expect(screen.getByText('外交: 赵国')).toBeTruthy()
    
    const summary = screen.getByTestId('diplomacy-relation-summary')
    expect(summary.textContent).toContain('态度: 10')
    expect(summary.textContent).toContain('信任: 20')
    expect(summary.textContent).toContain('状态: 和平')
  })

  it('renders active treaties correctly', () => {
    render(<DiplomacyPanel />)
    const treaties = screen.getByTestId('diplomacy-active-treaties')
    expect(treaties.textContent).toContain('treaty_1')
    expect(treaties.textContent).toContain('停战期内')
  })

  it('renders zhou investiture and coalition pressure', () => {
    mockState.zhouInvestiture = { recognizedTitle: '侯' }
    mockState.coalitionPressure = [{ id: 'coalition_1' }]
    render(<DiplomacyPanel />)
    
    const summary = screen.getByTestId('diplomacy-relation-summary')
    expect(summary.textContent).toContain('周天子册封: 侯')
    expect(summary.textContent).toContain('面临合纵压力')
  })

  it('handles envoy action success', () => {
    mockSubmitPlayerDiplomacyAction.mockReturnValue({ ok: true })
    render(<DiplomacyPanel />)
    
    fireEvent.click(screen.getByTestId('diplomacy-action-envoy'))
    
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({
      kind: 'envoy',
      targetRealmId: 'realm_zhao'
    })
    
    const feedback = screen.getByTestId('diplomacy-feedback')
    expect(feedback.textContent).toContain('Action submitted: envoy')
  })

  it('handles alliance action rejection', () => {
    mockSubmitPlayerDiplomacyAction.mockReturnValue({ ok: false, reason: 'truce_active' })
    render(<DiplomacyPanel />)
    
    fireEvent.click(screen.getByTestId('diplomacy-action-alliance'))
    
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({
      kind: 'alliance',
      targetRealmId: 'realm_zhao'
    })
    
    const feedback = screen.getByTestId('diplomacy-feedback')
    expect(feedback.textContent).toContain('Rejected: truce_active')
  })

  it('renders latest feedback from store', () => {
    mockState.feedbackList = [
      {
        targetRealmId: 'realm_zhao',
        status: 'rejected',
        reason: 'truce_active'
      }
    ]
    render(<DiplomacyPanel />)
    
    const feedback = screen.getByTestId('diplomacy-feedback')
    expect(feedback.textContent).toContain('最新状态: rejected')
    expect(feedback.textContent).toContain('原因: truce_active')
  })
})
