import type { General, GeneralId, RealmId, World } from '~/shared/types'
import {
  M6_ENABLED,
  M6_LEGITIMACY_BONUS_MULTIPLIER,
  M6_LEGITIMACY_BONUS_THRESHOLD,
} from '~/content/m2/balance'

export function candidateScore(general: General, world: World, realmId: RealmId): number {
  const baseScore = general.loyalty * 1000 + (general.attrs?.zheng ?? 0) + (general.attrs?.jiao ?? 0)
  const factionState = world.factionInfluences.get(realmId)
  let score = baseScore
  if (factionState && general.faction) {
    const factionInfluence = factionState.influences.get(general.faction) ?? 50
    score = baseScore * (1 + factionInfluence / 100)
  }

  if (M6_ENABLED) {
    const realm = world.realms.get(realmId)
    if (realm && (realm.prestige ?? 0) >= M6_LEGITIMACY_BONUS_THRESHOLD) {
      score *= M6_LEGITIMACY_BONUS_MULTIPLIER
    }
  }

  return score
}

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
    const scoreA = candidateScore(a, world, deceasedRealmId)
    const scoreB = candidateScore(b, world, deceasedRealmId)
    if (scoreB !== scoreA) return scoreB - scoreA

    return a.id.localeCompare(b.id)
  })

  return candidates[0]!.id
}
