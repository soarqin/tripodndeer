import type {
  GameDate,
  PeaceProposal,
  PeaceProposalId,
  World,
} from '~/shared/types'
import { endWar, warKey } from '~/engine/wars'
import { applyCession, applyIndemnity, applyTribute } from './peace-terms'

/**
 * Create a pending peace proposal and attach it to the active war between
 * the proposing and target realms.
 *
 * Status starts as 'pending' and `acknowledgedAt` is null until the target
 * accepts or rejects.
 */
export function createPeaceProposal(
  world: World,
  proposal: Omit<PeaceProposal, 'status' | 'acknowledgedAt'>,
): { world: World; proposalId: PeaceProposalId } {
  const fullProposal: PeaceProposal = {
    ...proposal,
    status: 'pending',
    acknowledgedAt: null,
  }

  const peaceProposals = new Map(world.peaceProposals)
  peaceProposals.set(proposal.id, fullProposal)

  const wars = new Map(world.wars)
  const key = warKey(proposal.proposingRealmId, proposal.targetRealmId)
  const warState = wars.get(key)
  if (warState) {
    wars.set(key, { ...warState, peaceProposalId: proposal.id })
  }

  return {
    world: { ...world, peaceProposals, wars },
    proposalId: proposal.id,
  }
}

/**
 * Accept a pending peace proposal:
 *  - mark proposal accepted with `acknowledgedAt`
 *  - apply each PeaceTerm to the world
 *  - end the underlying war
 *
 * No-op if proposal is missing or not in 'pending' status.
 */
export function acceptProposal(
  world: World,
  proposalId: PeaceProposalId,
  currentDate: GameDate,
): World {
  const proposal = world.peaceProposals.get(proposalId)
  if (!proposal || proposal.status !== 'pending') return world

  const accepted: PeaceProposal = {
    ...proposal,
    status: 'accepted',
    acknowledgedAt: currentDate,
  }
  const peaceProposals = new Map(world.peaceProposals)
  peaceProposals.set(proposalId, accepted)

  let w: World = { ...world, peaceProposals }

  for (const term of proposal.terms) {
    if (term.type === 'cession') w = applyCession(w, term)
    else if (term.type === 'indemnity') w = applyIndemnity(w, term, proposal.targetRealmId, proposal.proposingRealmId)
    else if (term.type === 'tribute') w = applyTribute(w, term)
  }

  const key = warKey(proposal.proposingRealmId, proposal.targetRealmId)
  const wars = endWar(w.wars, key)
  return { ...w, wars }
}

/**
 * Reject a pending peace proposal. The war continues; the proposal is
 * marked 'rejected' with `acknowledgedAt = null` (no acknowledgement of
 * any terms).
 *
 * No-op if proposal is missing or not in 'pending' status.
 */
export function rejectProposal(
  world: World,
  proposalId: PeaceProposalId,
): World {
  const proposal = world.peaceProposals.get(proposalId)
  if (!proposal || proposal.status !== 'pending') return world

  const rejected: PeaceProposal = {
    ...proposal,
    status: 'rejected',
    acknowledgedAt: null,
  }
  const peaceProposals = new Map(world.peaceProposals)
  peaceProposals.set(proposalId, rejected)
  return { ...world, peaceProposals }
}

/**
 * Score a peace proposal from the target realm's perspective. Higher score
 * means the target is more inclined to accept.
 *
 * Heuristic (M2):
 *   + 30 per site of the target currently occupied by the proposer
 *   + 0.5 * target.warWeariness
 *   - 5 per general the target still has (more generals = more capacity to fight)
 */
export function scoreProposalAcceptance(
  world: World,
  proposal: PeaceProposal,
): number {
  const { proposingRealmId, targetRealmId } = proposal
  const targetRealm = world.realms.get(targetRealmId)

  const occupiedCount = [...world.sites.values()].filter(
    s => s.ownerId === targetRealmId && s.occupation?.occupierId === proposingRealmId,
  ).length

  const warWeariness = targetRealm?.stats?.warWeariness ?? 0
  const targetGenerals = [...world.generals.values()].filter(
    g => g.realmId === targetRealmId,
  ).length

  return occupiedCount * 30 + warWeariness * 0.5 - targetGenerals * 5
}
