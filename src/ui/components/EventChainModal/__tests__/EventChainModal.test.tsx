import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventChainModal } from '../EventChainModal'
import { useGameStore, ModalPriority } from '~/ui/store'
import type { GameStoreState } from '~/ui/store/game-store'
import type { EventChainState } from '~/shared/types'

vi.mock('~/ui/store', () => ({
  useGameStore: vi.fn(),
  ModalPriority: {
    EVENT_CHAIN: 80,
  },
}))

vi.mock('~/engine/systems/events/event-chain-engine', () => ({
  getEventChain: vi.fn((id) => {
    if (id === 'event_lin_xiangru_bi') {
      return {
        id: 'event_lin_xiangru_bi',
        trigger: { type: 'date', between: [{ yearBC: 280 }, { yearBC: 278 }], realmId: 'realm_zhao' },
        stages: [
          {
            id: 'stage1',
            text: '秦昭襄王索和氏璧，赵王惧，蔺相如请命出使。',
            choices: [
              { id: 'send_lin', label: '派蔺相如出使', effects: [] },
              { id: 'send_jade', label: '送璧求和', effects: [] },
            ],
          },
        ],
      }
    }
    return null
  }),
}))

describe('EventChainModal', () => {
  let openModalMock: ReturnType<typeof vi.fn>
  let applyEventChainChoiceMock: ReturnType<typeof vi.fn>

  type StoreSelector = (state: GameStoreState) => unknown

  beforeEach(() => {
    openModalMock = vi.fn()
    applyEventChainChoiceMock = vi.fn()
  })

  it('should enqueue modal when there is an active event chain for the player', () => {
    const eventChainStates = new Map<string, EventChainState>([
      [
        'event_lin_xiangru_bi',
        {
          id: 'event_lin_xiangru_bi',
          currentStageId: 'stage1',
          completed: false,
          startedAtTick: 0,
          choiceHistory: [],
        },
      ],
    ])

    vi.mocked(useGameStore).mockImplementation((selector: StoreSelector) => {
      const state = {
        world: { eventChainStates },
        playerRealmId: 'realm_zhao',
        openModal: openModalMock,
        applyEventChainChoice: applyEventChainChoiceMock,
        modalQueue: [],
      } as unknown as GameStoreState
      vi.mocked(useGameStore).getState = () => state
      return selector(state)
    })

    render(<EventChainModal />)

    expect(openModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '历史事件',
        dismissable: false,
        priority: ModalPriority.EVENT_CHAIN,
        testId: 'event-chain-modal-event_lin_xiangru_bi',
        actions: [
          expect.objectContaining({ id: 'send_lin', label: '派蔺相如出使', testId: 'event-chain-choice-send_lin' }),
          expect.objectContaining({ id: 'send_jade', label: '送璧求和', testId: 'event-chain-choice-send_jade' }),
        ],
      })
    )
  })

  it('should not enqueue modal if the event chain is completed', () => {
    const eventChainStates = new Map<string, EventChainState>([
      [
        'event_lin_xiangru_bi',
        {
          id: 'event_lin_xiangru_bi',
          currentStageId: 'stage1',
          completed: true,
          startedAtTick: 0,
          choiceHistory: [],
        },
      ],
    ])

    vi.mocked(useGameStore).mockImplementation((selector: StoreSelector) => {
      const state = {
        world: { eventChainStates },
        playerRealmId: 'realm_zhao',
        openModal: openModalMock,
        applyEventChainChoice: applyEventChainChoiceMock,
        modalQueue: [],
      } as unknown as GameStoreState
      vi.mocked(useGameStore).getState = () => state
      return selector(state)
    })

    render(<EventChainModal />)

    expect(openModalMock).not.toHaveBeenCalled()
  })

  it('should not enqueue modal if the event chain belongs to another realm', () => {
    const eventChainStates = new Map<string, EventChainState>([
      [
        'event_lin_xiangru_bi',
        {
          id: 'event_lin_xiangru_bi',
          currentStageId: 'stage1',
          completed: false,
          startedAtTick: 0,
          choiceHistory: [],
        },
      ],
    ])

    vi.mocked(useGameStore).mockImplementation((selector: StoreSelector) => {
      const state = {
        world: { eventChainStates },
        playerRealmId: 'realm_qin',
        openModal: openModalMock,
        applyEventChainChoice: applyEventChainChoiceMock,
        modalQueue: [],
      } as unknown as GameStoreState
      vi.mocked(useGameStore).getState = () => state
      return selector(state)
    })

    render(<EventChainModal />)

    expect(openModalMock).not.toHaveBeenCalled()
  })

  it('should not enqueue modal if it is already in the queue', () => {
    const eventChainStates = new Map<string, EventChainState>([
      [
        'event_lin_xiangru_bi',
        {
          id: 'event_lin_xiangru_bi',
          currentStageId: 'stage1',
          completed: false,
          startedAtTick: 0,
          choiceHistory: [],
        },
      ],
    ])

    vi.mocked(useGameStore).mockImplementation((selector: StoreSelector) => {
      const state = {
        world: { eventChainStates },
        playerRealmId: 'realm_zhao',
        openModal: openModalMock,
        applyEventChainChoice: applyEventChainChoiceMock,
        modalQueue: [
          {
            priority: ModalPriority.EVENT_CHAIN,
            testId: 'event-chain-modal-event_lin_xiangru_bi',
          },
        ],
      } as unknown as GameStoreState
      vi.mocked(useGameStore).getState = () => state
      return selector(state)
    })

    render(<EventChainModal />)

    expect(openModalMock).not.toHaveBeenCalled()
  })
})
