import type { GameDate, PeaceProposal, RealmId, Treaty, World } from '~/shared/types'
import { M4_MONTHS_PER_SEASON, M4_MONTHS_PER_YEAR } from '~/content/m2/balance'

export interface TributeRelationship {
  readonly tributaryRealmId: RealmId
  readonly suzerainRealmId: RealmId
  readonly activeSinceTick: number
}

export function getActiveTributeRelationships(
  world: World,
): readonly TributeRelationship[] {
  const result: TributeRelationship[] = []

  for (const treaty of sortedTreaties(world.treaties)) {
    if (!isActiveTributeTreaty(treaty, world.tick)) continue
    result.push({
      tributaryRealmId: treaty.realmAId,
      suzerainRealmId: treaty.realmBId,
      activeSinceTick: treaty.signedAtTick,
    })
  }

  for (const proposal of sortedProposals(world.peaceProposals)) {
    if (proposal.status !== 'accepted') continue
    if (!proposal.acknowledgedAt) continue
    for (const term of proposal.terms) {
      if (term.type !== 'tribute') continue
      if (!isPeaceTributeActive(proposal.acknowledgedAt, world.date, term.payload.years)) continue
      result.push({
        tributaryRealmId: proposal.targetRealmId,
        suzerainRealmId: proposal.proposingRealmId,
        activeSinceTick: 0,
      })
    }
  }

  return result.sort((a, b) => {
    const byTributary = a.tributaryRealmId.localeCompare(b.tributaryRealmId)
    if (byTributary !== 0) return byTributary
    return a.suzerainRealmId.localeCompare(b.suzerainRealmId)
  })
}

function sortedTreaties(treaties: ReadonlyMap<string, Treaty>): readonly Treaty[] {
  return [...treaties.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function sortedProposals(
  proposals: ReadonlyMap<string, PeaceProposal>,
): readonly PeaceProposal[] {
  return [...proposals.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function isActiveTributeTreaty(treaty: Treaty, currentTick: number): boolean {
  if (treaty.kind !== 'tribute') return false
  if (treaty.status !== 'active') return false
  if (treaty.expiresAtTick !== null && treaty.expiresAtTick <= currentTick) return false
  return true
}

function isPeaceTributeActive(
  acknowledgedAt: GameDate,
  currentDate: GameDate,
  years: number,
): boolean {
  const elapsedMonths = toMonthOrdinal(currentDate) - toMonthOrdinal(acknowledgedAt)
  return elapsedMonths >= 0 && elapsedMonths < years * M4_MONTHS_PER_YEAR
}

function toMonthOrdinal(date: GameDate): number {
  return -date.yearBC * M4_MONTHS_PER_YEAR + seasonOffset(date.season) + date.month - 1
}

function seasonOffset(season: GameDate['season']): number {
  const seasonIndex = ['spring', 'summer', 'autumn', 'winter'].indexOf(season)
  return seasonIndex * M4_MONTHS_PER_SEASON
}
