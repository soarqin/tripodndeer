import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '@/ui/store'

beforeEach(() => {
  const store = useGameStore.getState()
  store.resetAllHints()
})

describe('coordinator idle during ScenarioPicker', () => {
  it('bootStatus starts as pending', () => {
    const store = useGameStore.getState()
    expect(store.bootStatus).toBe('pending')
  })

  it('hint queue is empty when bootStatus is pending', () => {
    const store = useGameStore.getState()
    expect(store.modalQueue.filter((modal) => modal.testId?.startsWith('hint-modal-')).length).toBe(0)
  })
})
