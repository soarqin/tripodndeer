import { beforeEach, describe, expect, it } from 'vitest'
import { ModalPriority, useGameStore } from '../game-store'

const noop = () => undefined

function modal(title: string, priority?: ModalPriority) {
  return {
    title,
    content: `${title} content`,
    actions: [{ id: 'ok', label: 'OK', onClick: noop }],
    priority,
  }
}

beforeEach(() => {
  useGameStore.getState().reset()
  useGameStore.getState().clearModalQueue()
})

describe('modal queue store', () => {
  it('enqueues one modal as visible head and pauses the clock', () => {
    useGameStore.getState().setSpeed('2x')
    useGameStore.getState().openModal(modal('first'))

    const state = useGameStore.getState()
    expect(state.modalQueue).toHaveLength(1)
    expect(state.modalQueue[0]?.title).toBe('first')
    expect(state.modalQueue[0]?.priority).toBe(ModalPriority.GENERIC)
    expect(state.previousClockSpeed).toBe('2x')
    expect(state.clockState.speed).toBe('pause')
  })

  it('orders different priorities with higher priority first', () => {
    useGameStore.getState().openModal(modal('generic', ModalPriority.GENERIC))
    useGameStore.getState().openModal(modal('succession', ModalPriority.SUCCESSION_CRISIS))

    expect(useGameStore.getState().modalQueue.map((entry) => entry.title)).toEqual([
      'succession',
      'generic',
    ])
  })

  it('keeps FIFO order for equal priority modals', () => {
    useGameStore.getState().openModal(modal('first', ModalPriority.EVENT_CHAIN))
    useGameStore.getState().openModal(modal('second', ModalPriority.EVENT_CHAIN))

    expect(useGameStore.getState().modalQueue.map((entry) => entry.title)).toEqual([
      'first',
      'second',
    ])
  })

  it('closing the head reveals the next modal while keeping the clock paused', () => {
    useGameStore.getState().setSpeed('4x')
    useGameStore.getState().openModal(modal('first', ModalPriority.GENERIC))
    useGameStore.getState().openModal(modal('second', ModalPriority.GENERIC))

    useGameStore.getState().closeModal()

    const state = useGameStore.getState()
    expect(state.modalQueue.map((entry) => entry.title)).toEqual(['second'])
    expect(state.clockState.speed).toBe('pause')
    expect(state.previousClockSpeed).toBe('4x')
  })

  it('closing the final modal restores the previous clock speed', () => {
    useGameStore.getState().setSpeed('5x')
    useGameStore.getState().openModal(modal('only'))

    useGameStore.getState().closeModal()

    const state = useGameStore.getState()
    expect(state.modalQueue).toEqual([])
    expect(state.clockState.speed).toBe('5x')
    expect(state.previousClockSpeed).toBe('5x')
  })

  it('accepts the existing succession modal openModal payload shape', () => {
    useGameStore.getState().openModal({
      title: '继承危机',
      content: '国君驾崩，储君未立。',
      dismissable: false,
      actions: [{ id: 'collateral', label: '强立旁系', onClick: noop }],
    })

    const queued = useGameStore.getState().modalQueue[0]
    expect(queued).toMatchObject({
      title: '继承危机',
      dismissable: false,
      priority: ModalPriority.GENERIC,
    })
  })
})
