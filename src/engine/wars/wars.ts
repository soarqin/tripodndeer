import type { RealmId, WarKey } from '~/shared/types'

export function warKey(a: RealmId, b: RealmId): WarKey {
  if (a === b) throw new Error('Realm cannot be at war with itself')
  return [a, b].sort().join(':')
}

export function isAtWar(wars: ReadonlyMap<WarKey, true>, a: RealmId, b: RealmId): boolean {
  if (a === b) return false
  return wars.has(warKey(a, b))
}

export function declareWar(wars: ReadonlyMap<WarKey, true>, a: RealmId, b: RealmId): ReadonlyMap<WarKey, true> {
  const key = warKey(a, b)
  if (wars.has(key)) return wars
  const next = new Map(wars)
  next.set(key, true)
  return next
}
