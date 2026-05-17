const PERSIST_REQUESTED_KEY = 'persist_requested'

function hasRequestedPersist(): boolean {
  try {
    return globalThis.localStorage?.getItem(PERSIST_REQUESTED_KEY) === 'true'
  } catch {
    return false
  }
}

function markRequestedPersist(): void {
  try {
    globalThis.localStorage?.setItem(PERSIST_REQUESTED_KEY, 'true')
  } catch {
    // noop
  }
}

export async function requestPersistentStorage(): Promise<void> {
  if (hasRequestedPersist()) return

  const storage = globalThis.navigator?.storage
  if (!storage?.persist) return

  markRequestedPersist()
  await storage.persist()
}

export async function isPersisted(): Promise<boolean> {
  const storage = globalThis.navigator?.storage
  if (!storage?.persisted) return false

  return storage.persisted()
}
