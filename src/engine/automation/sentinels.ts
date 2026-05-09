import type { RealmId } from '~/shared/types/core'
import type { World } from '~/shared/types/world'

export const AI_ONLY_PLAYER_REALM_ID = '__ai_only__' as const

export type AIOnlyRealmId = typeof AI_ONLY_PLAYER_REALM_ID

export function isAIRealm(world: World, realmId: RealmId): boolean {
  if (world.playerRealmId === AI_ONLY_PLAYER_REALM_ID) {
    return true
  }

  return realmId !== world.playerRealmId
}
