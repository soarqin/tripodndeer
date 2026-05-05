import type { SiteId, RealmId, ArmyId } from './core'
import type { GeneralId, Post } from './character'
import type { CasusBelliId, PeaceTerm } from './diplomacy'

export type EdictId = string

export type EdictKind = 'edict_tax_relief' | 'edict_grain_reserve'
export type EdictStatus = 'active' | 'expired'
export type GovernorModifierKind = 'tax_efficiency' | 'food_efficiency'

export interface RealmEconomy {
  readonly treasury: number
  readonly foodStores: number
  readonly taxRate: number
}

export interface SiteEconomy {
  readonly population: number
  readonly households: number
  readonly taxBase: number
  readonly foodProduction: number
}

export interface EdictState {
  readonly id: EdictId
  readonly realmId: RealmId
  readonly kind: EdictKind
  readonly startedAtTick: number
  readonly durationMonths: number
  readonly remainingMonths: number
  readonly status: EdictStatus
}

export interface GovernorAssignment {
  readonly siteId: SiteId
  readonly realmId: RealmId
  readonly generalId: GeneralId
  readonly assignedAtTick: number
  readonly modifierKind: GovernorModifierKind
}

export type OrderType =
  | 'march'
  | 'declareWarAndMarch'
  | 'declare-war'
  | 'propose-peace'
  | 'activate-edict'
  | 'assign-governor'
  | 'assign-post'
  | 'unassign-post'

export interface ActivateEdictOrder {
  readonly type: 'activate-edict'
  readonly edictId: EdictId
  readonly realmId: RealmId
  readonly kind: EdictKind
  readonly durationMonths: number
}

export interface AssignGovernorOrder {
  readonly type: 'assign-governor'
  readonly siteId: SiteId
  readonly generalId: GeneralId
}

export interface AssignPostOrder {
  readonly type: 'assign-post'
  readonly generalId: GeneralId
  readonly post: Post
}

export interface UnassignPostOrder {
  readonly type: 'unassign-post'
  readonly generalId: GeneralId
  readonly post: Post
}

export interface PeaceProposalOrderData {
  readonly proposalId: string
  readonly proposingRealmId: RealmId
  readonly targetRealmId: RealmId
  readonly terms: readonly PeaceTerm[]
}

export interface Order {
  readonly type: OrderType
  readonly armyId?: ArmyId
  readonly targetSiteId?: SiteId
  readonly siteId?: SiteId
  readonly targetRealmId?: RealmId
  readonly realmId?: RealmId
  readonly casusBelli?: CasusBelliId
  readonly peaceProposalData?: PeaceProposalOrderData
  readonly edictId?: EdictId
  readonly kind?: EdictKind
  readonly durationMonths?: number
  readonly generalId?: GeneralId
  readonly post?: Post
}
