import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReformPromptModal } from '../ReformPromptModal'
import { useGameStore } from '~/ui/store/game-store'
import type { GameStoreState } from '~/ui/store/game-store'
import type { ReformState } from '~/shared/types'
import { selectActiveReformForPlayerRealm, selectPlayerActiveReform } from '~/ui/store/selectors'

vi.mock('~/ui/store/game-store', () => ({
  useGameStore: vi.fn(),
  ModalPriority: {
    REFORM_PROMPT: 60,
  },
}))

vi.mock('~/ui/store/selectors', () => ({
  selectActiveReformForPlayerRealm: vi.fn(),
  selectPlayerActiveReform: vi.fn(),
}))

describe('ReformPromptModal', () => {
  const mockOpenModal = vi.fn()
  const mockCloseModal = vi.fn()
  const mockApplyReformChoice = vi.fn()
  type StoreSelector = (state: GameStoreState) => unknown
  type ActiveReformSelection = NonNullable<ReturnType<typeof selectActiveReformForPlayerRealm>>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not open modal when no active reform', () => {
    vi.mocked(selectActiveReformForPlayerRealm).mockReturnValue(null)
    vi.mocked(selectPlayerActiveReform).mockReturnValue(null)

    vi.mocked(useGameStore).mockImplementation((selector: StoreSelector) => {
      if (selector === selectActiveReformForPlayerRealm) return null
      if (selector === selectPlayerActiveReform) return null
      
      const state = {
        playerRealmId: 'realm_qin',
        openModal: mockOpenModal,
        closeModal: mockCloseModal,
        applyReformChoice: mockApplyReformChoice,
        modalQueue: [],
      } as unknown as GameStoreState
      return selector(state)
    })

    render(<ReformPromptModal />)
    expect(mockOpenModal).not.toHaveBeenCalled()
  })

  it('opens modal when player realm has active reform', () => {
    const reformState: ReformState = {
      realmId: 'realm_zhao',
      reformId: 'reform_hu_fu_qi_she',
      status: 'in_progress',
      currentStageId: 'stage_1',
      startedAtTick: 0,
      stageEnteredAtTick: 0,
      choiceHistory: [],
    }

    const activeReform = {
      reform: {
        id: 'reform_hu_fu_qi_she',
        displayNameZh: '胡服骑射',
        stages: [
          {
            id: 'stage_1',
            textZh: '赵武灵王欲变服骑射。',
            choices: [
              { id: 'choice_1', labelZh: '推行胡服' },
              { id: 'choice_2', labelZh: '维持传统' },
            ]
          }
        ]
      },
      currentStage: {
        id: 'stage_1',
        textZh: '赵武灵王欲变服骑射。',
        choices: [
          { id: 'choice_1', labelZh: '推行胡服' },
          { id: 'choice_2', labelZh: '维持传统' },
        ]
      }
    } as unknown as ActiveReformSelection

    vi.mocked(selectActiveReformForPlayerRealm).mockReturnValue(activeReform)
    vi.mocked(selectPlayerActiveReform).mockReturnValue(reformState)

    vi.mocked(useGameStore).mockImplementation((selector: StoreSelector) => {
      if (selector === selectActiveReformForPlayerRealm) return activeReform
      if (selector === selectPlayerActiveReform) return reformState
      
      const state = {
        playerRealmId: 'realm_zhao',
        openModal: mockOpenModal,
        closeModal: mockCloseModal,
        applyReformChoice: mockApplyReformChoice,
        modalQueue: [],
      } as unknown as GameStoreState
      return selector(state)
    })

    render(<ReformPromptModal />)
    
    expect(mockOpenModal).toHaveBeenCalledTimes(1)
    const modalArgs = mockOpenModal.mock.calls[0][0]
    
    expect(modalArgs.title).toBe('变法抉择')
    expect(modalArgs.dismissable).toBe(false)
    expect(modalArgs.testId).toBe('reform-prompt-modal')
    expect(modalArgs.actions).toEqual([])
  })

  it('does not open modal if already in queue', () => {
    const reformState: ReformState = {
      realmId: 'realm_zhao',
      reformId: 'reform_hu_fu_qi_she',
      status: 'in_progress',
      currentStageId: 'stage_1',
      startedAtTick: 0,
      stageEnteredAtTick: 0,
      choiceHistory: [],
    }

    const activeReform = {
      reform: { id: 'reform_hu_fu_qi_she' },
      currentStage: { id: 'stage_1' }
    } as unknown as ActiveReformSelection

    vi.mocked(selectActiveReformForPlayerRealm).mockReturnValue(activeReform)
    vi.mocked(selectPlayerActiveReform).mockReturnValue(reformState)

    vi.mocked(useGameStore).mockImplementation((selector: StoreSelector) => {
      if (selector === selectActiveReformForPlayerRealm) return activeReform
      if (selector === selectPlayerActiveReform) return reformState
      
      const state = {
        playerRealmId: 'realm_zhao',
        openModal: mockOpenModal,
        closeModal: mockCloseModal,
        applyReformChoice: mockApplyReformChoice,
        modalQueue: [{ testId: 'reform-prompt-modal' }],
      } as unknown as GameStoreState
      return selector(state)
    })

    render(<ReformPromptModal />)
    expect(mockOpenModal).not.toHaveBeenCalled()
  })
})
