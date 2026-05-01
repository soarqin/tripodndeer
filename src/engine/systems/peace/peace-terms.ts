import type { GameDate, PeaceProposal, PeaceTerm, RealmId, World } from '~/shared/types'
import { M4_MONTHS_PER_SEASON, M4_MONTHS_PER_YEAR } from '~/content/m2/balance'

/**
 * Apply a 'cession' peace term: transfer ownership of ceded sites to the
 * realm currently occupying them (the proposing realm in typical use).
 *
 * If a site has no occupation record, ownership is left unchanged (defensive
 * fallback — should not happen in practice when the term is legitimately
 * negotiated).
 */
export function applyCession(
  world: World,
  term: Extract<PeaceTerm, { type: 'cession' }>,
): World {
  const sites = new Map(world.sites)
  for (const siteId of term.payload.siteIds) {
    const site = sites.get(siteId)
    if (!site) continue
    sites.set(siteId, {
      ...site,
      ownerId: site.occupation?.occupierId ?? site.ownerId,
    })
  }
  return { ...world, sites }
}

export function applyIndemnity(
  world: World,
  term: Extract<PeaceTerm, { type: 'indemnity' }>,
  payerRealmId?: RealmId,
  receiverRealmId?: RealmId,
): World {
  if (!payerRealmId || !receiverRealmId) return world
  return transferTreasury(world, payerRealmId, receiverRealmId, term.payload.amount)
}

export function applyTribute(
  world: World,
  _term: Extract<PeaceTerm, { type: 'tribute' }>,
): World {
  return world
}

export function settlePeaceTributes(world: World): World {
  let nextWorld = world

  for (const proposal of sortedAcceptedProposals(world.peaceProposals)) {
    if (!proposal.acknowledgedAt) continue
    for (const term of proposal.terms) {
      if (term.type !== 'tribute') continue
      if (!isTributeActive(proposal.acknowledgedAt, world.date, term.payload.years)) continue

      const monthlyAmount = Math.floor(term.payload.amountPerYear / M4_MONTHS_PER_YEAR)
      nextWorld = transferTreasury(
        nextWorld,
        proposal.targetRealmId,
        proposal.proposingRealmId,
        monthlyAmount,
      )
    }
  }

  return nextWorld
}

function transferTreasury(
  world: World,
  payerRealmId: RealmId,
  receiverRealmId: RealmId,
  requestedAmount: number,
): World {
  if (payerRealmId === receiverRealmId || requestedAmount <= 0) return world

  const payer = world.realms.get(payerRealmId)
  const receiver = world.realms.get(receiverRealmId)
  if (!payer || !receiver) return world

  const paidAmount = Math.min(requestedAmount, payer.economy.treasury)
  if (paidAmount <= 0) return world

  const realms = new Map(world.realms)
  realms.set(payerRealmId, {
    ...payer,
    economy: {
      ...payer.economy,
      treasury: payer.economy.treasury - paidAmount,
    },
  })
  realms.set(receiverRealmId, {
    ...receiver,
    economy: {
      ...receiver.economy,
      treasury: receiver.economy.treasury + paidAmount,
    },
  })

  return { ...world, realms }
}

function sortedAcceptedProposals(
  peaceProposals: ReadonlyMap<string, PeaceProposal>,
): readonly PeaceProposal[] {
  return [...peaceProposals.values()]
    .filter(proposal => proposal.status === 'accepted')
    .sort((a, b) => a.id.localeCompare(b.id))
}

function isTributeActive(acknowledgedAt: GameDate, currentDate: GameDate, years: number): boolean {
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
