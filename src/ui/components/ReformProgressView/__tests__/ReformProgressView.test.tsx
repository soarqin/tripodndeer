import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ReformProgressView } from '../ReformProgressView'
import type { ReformDefinition, ReformState } from '~/shared/types'

describe('ReformProgressView', () => {
  const mockReform: ReformDefinition = {
    id: 'test_reform',
    displayName: 'Test Reform',
    displayNameZh: '测试变法',
    trigger: { kind: 'realm.id', value: 'realm_qin' },
    oneShot: true,
    successTrait: 'success',
    failureTrait: 'failure',
    stages: [
      {
        id: 'stage_1',
        textZh: '这是第一阶段的描述',
        advanceAfterMonths: 12,
        choices: [
          { id: 'choice_1a', labelZh: '选择1A', effects: [], outcome: 'continue' },
          { id: 'choice_1b', labelZh: '选择1B', effects: [], outcome: 'continue' },
        ],
      },
      {
        id: 'stage_2',
        textZh: '这是第二阶段的描述',
        advanceAfterMonths: 12,
        choices: [
          { id: 'choice_2a', labelZh: '选择2A', effects: [], outcome: 'success' },
        ],
      },
    ],
  }

  const mockState: ReformState = {
    realmId: 'realm_qin',
    reformId: 'test_reform',
    currentStageId: 'stage_1',
    startedAtTick: 0,
    stageEnteredAtTick: 0,
    status: 'in_progress',
    choiceHistory: [],
  }

  it('renders stage text and progress', () => {
    render(<ReformProgressView reform={mockReform} state={mockState} onChoose={vi.fn()} />)
    
    expect(screen.getByTestId('reform-progress-modal')).toBeDefined()
    expect(screen.getByText('测试变法')).toBeDefined()
    expect(screen.getByText('第 1 / 2 阶段')).toBeDefined()
    expect(screen.getByTestId('reform-stage-text').textContent).toContain('这是第一阶段的描述')
  })

  it('renders choice buttons', () => {
    render(<ReformProgressView reform={mockReform} state={mockState} onChoose={vi.fn()} />)
    
    expect(screen.getByTestId('reform-choice-choice_1a').textContent).toContain('选择1A')
    expect(screen.getByTestId('reform-choice-choice_1b').textContent).toContain('选择1B')
  })

  it('clicking choice calls onChoose', () => {
    const onChoose = vi.fn()
    render(<ReformProgressView reform={mockReform} state={mockState} onChoose={onChoose} />)
    
    fireEvent.click(screen.getByTestId('reform-choice-choice_1a'))
    expect(onChoose).toHaveBeenCalledWith('choice_1a')
  })

  it('renders choice history', () => {
    const stateWithHistory: ReformState = {
      ...mockState,
      currentStageId: 'stage_2',
      choiceHistory: [
        { stageId: 'stage_1', choiceId: 'choice_1b', tick: 10 }
      ],
    }
    
    render(<ReformProgressView reform={mockReform} state={stateWithHistory} onChoose={vi.fn()} />)
    
    expect(screen.getByText('第 2 / 2 阶段')).toBeDefined()
    expect(screen.getByTestId('reform-stage-text').textContent).toContain('这是第二阶段的描述')
    
    const historyList = screen.getByTestId('reform-history-list')
    expect(historyList).toBeDefined()
    expect(historyList.textContent).toContain('[stage_1]')
    expect(historyList.textContent).toContain('选择1B')
  })
})
