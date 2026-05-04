import { M8_TAX_RATE_TARGET, M8_TREASURY_RESERVE_FLOOR } from '~/content/m2/balance'
import type { RealmId, World } from '~/shared/types'
import { getPersonality } from './utility-scorer'

export function applyAIEconomyDecision(world: World, realmId: RealmId): World {
  const realm = world.realms.get(realmId)
  if (!realm) return world

  const personality = getPersonality(world, realmId)
  if (personality === 'incompetent') return world

  const targetRate = M8_TAX_RATE_TARGET[personality]
  const currentRate = realm.economy.taxRate
  const reserveFloor = M8_TREASURY_RESERVE_FLOOR[personality]
  const belowFloor = realm.economy.treasury < reserveFloor
  const maxDelta = belowFloor ? 4 : 2
  const delta = Math.sign(targetRate - currentRate) * Math.min(maxDelta, Math.abs(targetRate - currentRate))
  if (delta === 0) return world

  const newRate = Math.max(0, Math.min(50, currentRate + delta))
  const newRealm = { ...realm, economy: { ...realm.economy, taxRate: newRate } }
  const newRealms = new Map(world.realms)
  newRealms.set(realmId, newRealm)

  return { ...world, realms: newRealms }
}
