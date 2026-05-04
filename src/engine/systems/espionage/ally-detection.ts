import type { RealmId, Treaty, TreatyId } from '~/shared/types'

export function getActiveAllies(
  treaties: ReadonlyMap<TreatyId, Treaty>,
  realmId: RealmId,
): ReadonlySet<RealmId> {
  const allies = new Set<RealmId>()
  for (const treaty of treaties.values()) {
    if (treaty.kind !== 'alliance' || treaty.status !== 'active') continue
    if (treaty.realmAId === realmId) allies.add(treaty.realmBId)
    else if (treaty.realmBId === realmId) allies.add(treaty.realmAId)
  }
  return allies
}
