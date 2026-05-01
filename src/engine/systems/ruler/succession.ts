import type { GeneralId, RealmId, World } from '~/shared/types'

export function selectHeir(world: World, deceasedRealmId: RealmId): GeneralId | null {
  const currentRuler = world.rulers.get(deceasedRealmId)

  const candidates = [...world.generals.values()].filter((g) => {
    if (g.realmId !== deceasedRealmId) return false
    if (g.id === currentRuler?.generalId) return false
    if (g.loyaltyState !== undefined && g.loyaltyState !== 'loyal') return false
    if ((g.attrs?.po ?? 0) < 10) return false

    const specialty = g.specialty
    if (
      specialty !== undefined &&
      specialty !== 'commander' &&
      specialty !== 'administrator' &&
      specialty !== 'strategist'
    ) {
      return false
    }

    return true
  })

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    const loyaltyA = a.loyalty
    const loyaltyB = b.loyalty
    if (loyaltyB !== loyaltyA) return loyaltyB - loyaltyA

    const scoreA = (a.attrs?.zheng ?? 0) + (a.attrs?.jiao ?? 0)
    const scoreB = (b.attrs?.zheng ?? 0) + (b.attrs?.jiao ?? 0)
    if (scoreB !== scoreA) return scoreB - scoreA

    return a.id.localeCompare(b.id)
  })

  return candidates[0]!.id
}
