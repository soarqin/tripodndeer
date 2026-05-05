import type { RealmId, SiteId, ArmyId } from './core'
import type { GameDate } from './world'

export type WarKey = string

export type CasusBelliId = string
export type PeaceProposalId = string

export type RelationKey = string
export type DiplomaticProposalId = string
export type TreatyId = string
export type DiplomacyEventId = string
export type CoalitionId = string

export type DiplomaticActionKind = 'alliance' | 'non_aggression' | 'tribute' | 'marriage' | 'envoy' | 'declare_war' | 'peace'
export type DiplomaticProposalStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
export type DiplomaticTreatyKind = 'alliance' | 'non_aggression' | 'tribute' | 'marriage' | 'truce'
export type DiplomaticTreatyStatus = 'active' | 'expired' | 'cancelled' | 'broken'
export type DiplomacyEventKind = 'proposal_created' | 'proposal_resolved' | 'treaty_created' | 'treaty_ended' | 'war_declared' | 'betrayal' | 'relation_changed' | 'coalition_changed' | 'zhou_investiture_changed'
export type DiplomacyEventReason = 'war_declaration_against_treaty'
export type CoalitionStatus = 'forming' | 'active' | 'dissolved'

export interface DiplomaticRelation {
  readonly key: RelationKey
  readonly realmAId: RealmId
  readonly realmBId: RealmId
  readonly attitude: number
  readonly trust: number
  readonly updatedAt: GameDate
}

export interface DiplomaticProposal {
  readonly id: DiplomaticProposalId
  readonly kind: DiplomaticActionKind
  readonly proposingRealmId: RealmId
  readonly targetRealmId: RealmId
  readonly status: DiplomaticProposalStatus
  readonly proposedAt: GameDate
  readonly proposedAtTick: number
  readonly expiresAt: GameDate
  readonly expiresAtTick: number
  readonly resolvedAt: GameDate | null
  readonly resolvedAtTick: number | null
  readonly treatyId: TreatyId | null
}

export interface Treaty {
  readonly id: TreatyId
  readonly kind: DiplomaticTreatyKind
  readonly realmAId: RealmId
  readonly realmBId: RealmId
  readonly status: DiplomaticTreatyStatus
  readonly signedAt: GameDate
  readonly signedAtTick: number
  readonly expiresAt: GameDate | null
  readonly expiresAtTick: number | null
  readonly endedAt: GameDate | null
  readonly endedAtTick: number | null
  readonly sourceProposalId: DiplomaticProposalId | null
}

export interface DiplomacyEvent {
  readonly id: DiplomacyEventId
  readonly kind: DiplomacyEventKind
  readonly occurredAt: GameDate
  readonly actorRealmId: RealmId | null
  readonly targetRealmId: RealmId | null
  readonly proposalId?: DiplomaticProposalId
  readonly treatyId?: TreatyId
  readonly relationKey?: RelationKey
  readonly coalitionId?: CoalitionId
  readonly reason?: DiplomacyEventReason
}

export interface CoalitionState {
  readonly id: CoalitionId
  readonly targetRealmId: RealmId
  readonly memberRealmIds: readonly RealmId[]
  readonly status: CoalitionStatus
  readonly formedAt: GameDate
  readonly dissolvedAt: GameDate | null
}

export interface ZhouInvestitureState {
  readonly realmId: RealmId
  readonly recognizedTitle: string
  readonly grantedAtTick: number
  readonly expiresAtTick: number | null
  readonly source: 'zhou'
  readonly rank?: 'duke' | 'marquis' | 'count' | 'viscount' | 'baron'
  readonly lastTributeTick?: number
}

export interface WarState {
  casusBelli: CasusBelliId | null
  declaredAt: GameDate
  occupiedSites: ReadonlyMap<SiteId, RealmId>
  peaceProposalId: PeaceProposalId | null
}

export type AttitudeBucket = 'hostile' | 'cold' | 'neutral' | 'friendly' | 'ally'

export interface CessionPayload { siteIds: SiteId[] }
export interface IndemnityPayload { amount: number }
export interface TributePayload { amountPerYear: number; years: number }

export type PeaceTerm =
  | { type: 'cession'; payload: CessionPayload }
  | { type: 'indemnity'; payload: IndemnityPayload }
  | { type: 'tribute'; payload: TributePayload }

export interface PeaceProposal {
  id: PeaceProposalId
  proposingRealmId: RealmId
  targetRealmId: RealmId
  terms: ReadonlyArray<PeaceTerm>
  proposedAt: GameDate
  status: 'pending' | 'accepted' | 'rejected'
  acknowledgedAt: GameDate | null
}

export type SiegeId = string

export interface Siege {
  readonly id: SiegeId
  readonly attackerArmyIds: readonly ArmyId[]
  readonly defenderSiteId: SiteId
  readonly startedAt: GameDate
  readonly durationTicks: number
  readonly fortification: number
  readonly supplyRemaining: number
}
