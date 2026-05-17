import 'fake-indexeddb/auto'

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { isPersisted, requestPersistentStorage } from '../persist-request'

describe('persist-request', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests persistent storage once after the first manual save', async () => {
    const persist = vi.fn(async () => true)
    vi.stubGlobal('navigator', {
      storage: {
        persist,
        persisted: vi.fn(async () => false),
      },
    })

    await requestPersistentStorage()
    await requestPersistentStorage()

    expect(persist).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('persist_requested')).toBe('true')
  })

  it('returns the persisted status when supported', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persist: vi.fn(async () => true),
        persisted: vi.fn(async () => true),
      },
    })

    await expect(isPersisted()).resolves.toBe(true)
  })

  it('noops when persistent storage is unsupported', async () => {
    vi.stubGlobal('navigator', {})

    await expect(requestPersistentStorage()).resolves.toBeUndefined()
    expect(localStorage.getItem('persist_requested')).toBe(null)
  })
})
