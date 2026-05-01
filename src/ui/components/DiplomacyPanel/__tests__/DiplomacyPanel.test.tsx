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

  it('renders localized action labels for diplomacy actions', () => {
    render(<DiplomacyPanel />)

    expect(screen.getByRole('button', { name: '遣使' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '盟约' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '互不侵犯' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '朝贡' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '联姻' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '宣战' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '议和' })).toBeTruthy()
  })

  it('submits internal action ids for all actions', () => {
    mockSubmitPlayerDiplomacyAction.mockReturnValue({ ok: true })
    render(<DiplomacyPanel />)

    fireEvent.click(screen.getByTestId('diplomacy-action-envoy'))
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({ kind: 'envoy', targetRealmId: 'realm_zhao' })

    fireEvent.click(screen.getByTestId('diplomacy-action-alliance'))
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({ kind: 'alliance', targetRealmId: 'realm_zhao' })

    fireEvent.click(screen.getByTestId('diplomacy-action-non_aggression'))
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({ kind: 'non_aggression', targetRealmId: 'realm_zhao' })

    fireEvent.click(screen.getByTestId('diplomacy-action-tribute'))
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({ kind: 'tribute', targetRealmId: 'realm_zhao' })

    fireEvent.click(screen.getByTestId('diplomacy-action-marriage'))
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({ kind: 'marriage', targetRealmId: 'realm_zhao' })

    fireEvent.click(screen.getByTestId('diplomacy-action-declare_war'))
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({ kind: 'declare_war', targetRealmId: 'realm_zhao' })

    fireEvent.click(screen.getByTestId('diplomacy-action-peace'))
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({ kind: 'peace', targetRealmId: 'realm_zhao' })
  })

  it('renders zhou investiture and coalition pressure', () => {
    mockState.zhouInvestiture = { recognizedTitle: '侯' }
    mockState.coalitionPressure = [{ id: 'coalition_1' }]
    render(<DiplomacyPanel />)
    
    const summary = screen.getByTestId('diplomacy-relation-summary')
    expect(summary.textContent).toContain('周天子册封: 侯')
    expect(summary.textContent).toContain('面临合纵压力')
  })

  it('handles envoy action success with localized feedback copy', () => {
    mockSubmitPlayerDiplomacyAction.mockReturnValue({ ok: true })
    render(<DiplomacyPanel />)
    
    fireEvent.click(screen.getByTestId('diplomacy-action-envoy'))
    
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({
      kind: 'envoy',
      targetRealmId: 'realm_zhao'
    })
    
    const feedback = screen.getByTestId('diplomacy-feedback')
    expect(feedback.textContent).toContain('行动已提交：遣使')
    expect(screen.queryByText(/Action submitted:/)).toBeNull()
  })

  it('maps truce rejection to localized player-facing copy', () => {
    mockSubmitPlayerDiplomacyAction.mockReturnValue({ ok: false, reason: 'truce_active' })
    render(<DiplomacyPanel />)
    
    fireEvent.click(screen.getByTestId('diplomacy-action-alliance'))
    
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({
      kind: 'alliance',
      targetRealmId: 'realm_zhao'
    })
    
    const feedback = screen.getByTestId('diplomacy-feedback')
    expect(feedback.textContent).toContain('已拒绝：停战期内不可宣战')
    expect(screen.queryByText(/Rejected:/)).toBeNull()
    expect(screen.queryByText(/truce_active/)).toBeNull()
  })

  it('falls back to a generic localized rejection reason for unknown codes', () => {
    mockSubmitPlayerDiplomacyAction.mockReturnValue({ ok: false, reason: 'unexpected_reason' })
    render(<DiplomacyPanel />)

    fireEvent.click(screen.getByTestId('diplomacy-action-peace'))

    const feedback = screen.getByTestId('diplomacy-feedback')
    expect(feedback.textContent).toContain('已拒绝：行动暂不可用')
  })

  it('renders latest feedback from store with localized rejection copy', () => {
    mockState.feedbackList = [
      {
        targetRealmId: 'realm_zhao',
        status: 'rejected',
        reason: 'truce_active'
      }
    ]
    render(<DiplomacyPanel />)
    
    const feedback = screen.getByTestId('diplomacy-feedback')
    expect(feedback.textContent).toContain('已拒绝：停战期内不可宣战')
    expect(screen.queryByText(/truce_active/)).toBeNull()
    expect(screen.queryByText(/rejected/)).toBeNull()
  })

  it('renders non-rejected latest feedback from store with localized copy', () => {
    mockState.feedbackList = [
      {
        targetRealmId: 'realm_zhao',
        status: 'submitted',
        reason: 'some_unknown_reason'
      }
    ]
    render(<DiplomacyPanel />)
    
    const feedback = screen.getByTestId('diplomacy-feedback')
    expect(feedback.textContent).toContain('最新状态: 已提交')
    expect(feedback.textContent).toContain('原因: 行动暂不可用')
    expect(screen.queryByText(/submitted/)).toBeNull()
    expect(screen.queryByText(/some_unknown_reason/)).toBeNull()
  })

  it('submits tribute and marriage as metadata-only actions without economy or character payloads', () => {
    mockSubmitPlayerDiplomacyAction.mockReturnValue({ ok: true })
    render(<DiplomacyPanel />)

    fireEvent.click(screen.getByTestId('diplomacy-action-tribute'))
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({ kind: 'tribute', targetRealmId: 'realm_zhao' })
    
    fireEvent.click(screen.getByTestId('diplomacy-action-marriage'))
    expect(mockSubmitPlayerDiplomacyAction).toHaveBeenCalledWith({ kind: 'marriage', targetRealmId: 'realm_zhao' })

    // Verify no extra payload fields are sent
    const tributeCall = mockSubmitPlayerDiplomacyAction.mock.calls.find(call => call[0].kind === 'tribute')
    expect(tributeCall[0]).not.toHaveProperty('treasury')
    expect(tributeCall[0]).not.toHaveProperty('tax')
    expect(tributeCall[0]).not.toHaveProperty('food')
    expect(tributeCall[0]).not.toHaveProperty('population')
    expect(tributeCall[0]).not.toHaveProperty('economy')

    const marriageCall = mockSubmitPlayerDiplomacyAction.mock.calls.find(call => call[0].kind === 'marriage')
    expect(marriageCall[0]).not.toHaveProperty('character')
    expect(marriageCall[0]).not.toHaveProperty('spouse')
  })
})
