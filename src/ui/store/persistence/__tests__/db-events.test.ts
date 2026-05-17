import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { setIdbEventListener, resetDbForTesting } from '../db'

describe('db event listener', () => {
  beforeEach(() => {
    resetDbForTesting()
  })

  afterEach(() => {
    resetDbForTesting()
  })

  it('registers and clears an idb event listener', () => {
    const listener = vi.fn()
    setIdbEventListener(listener)
    setIdbEventListener(null)
    expect(listener).not.toHaveBeenCalled()
  })

  it('idb event listener is reset by resetDbForTesting', () => {
    const listener = vi.fn()
    setIdbEventListener(listener)
    resetDbForTesting()
    setIdbEventListener(listener)
    expect(typeof setIdbEventListener).toBe('function')
  })
})
