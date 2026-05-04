import type { EdgeId, RealmId, SiteId } from '~/shared/types'

export function computeRealmAdjacency(
  sites: ReadonlyArray<{ id: SiteId; boundary: ReadonlyArray<{ edge: EdgeId }> }>,
  ownership: Record<SiteId, RealmId>,
): ReadonlyMap<RealmId, ReadonlySet<RealmId>> {
  const edgeToSites = new Map<EdgeId, SiteId[]>()
  for (const site of sites) {
    for (const ref of site.boundary) {
      const list = edgeToSites.get(ref.edge) ?? []
      list.push(site.id)
      edgeToSites.set(ref.edge, list)
    }
  }

  const adj = new Map<RealmId, Set<RealmId>>()
  for (const [, siteIds] of edgeToSites) {
    if (siteIds.length !== 2) continue
    const ownerA = ownership[siteIds[0]!]
    const ownerB = ownership[siteIds[1]!]
    if (!ownerA || !ownerB || ownerA === ownerB) continue
    if (!adj.has(ownerA)) adj.set(ownerA, new Set())
    if (!adj.has(ownerB)) adj.set(ownerB, new Set())
    adj.get(ownerA)!.add(ownerB)
    adj.get(ownerB)!.add(ownerA)
  }

  const sorted = [...adj.entries()].sort(([a], [b]) => a.localeCompare(b))
  return new Map(sorted.map(([k, v]) => [k, new Set([...v].sort())]))
}
