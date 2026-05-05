import type { RealmId, SiteId } from './core'
import type { FactionId } from './character'
import type { Effect, PredicateNode } from './events'
import type { Ideology } from './world'

export type DisasterId = string
export type TradeRouteId = string
export type FactionImbalanceEventId = string

export type ReformId = string

export interface ReformChoice {
  readonly id: string
  readonly labelZh: string
  readonly effects: readonly Effect[]
  readonly nextStageId?: string
  readonly outcome: 'continue' | 'success' | 'failure'
}

export interface ReformStage {
  readonly id: string
  readonly textZh: string
  readonly choices: readonly ReformChoice[]
  readonly advanceAfterMonths: number
}

export interface ReformDefinition {
  readonly id: ReformId
  readonly displayName: string
  readonly displayNameZh: string
  readonly trigger: PredicateNode
  readonly oneShot: true
  readonly stages: readonly ReformStage[]
  readonly successTrait: string
  readonly failureTrait: string
  readonly historicalYearRange?: readonly [number, number]
}

export interface ReformState {
  readonly realmId: RealmId
  readonly reformId: ReformId
  readonly currentStageId: string
  readonly startedAtTick: number
  readonly stageEnteredAtTick: number
  readonly status: 'in_progress' | 'completed_success' | 'completed_failure' | 'paused'
  readonly choiceHistory: readonly { stageId: string; choiceId: string; tick: number }[]
}

export interface DisasterChoice {
  readonly id: string
  readonly labelZh: string
  readonly costType: 'treasury' | 'foodStores' | 'morale' | 'none'
  readonly costAmount: number
  readonly effects: readonly Effect[]
  readonly outcomeZh: string
}

export interface DisasterDefinition {
  readonly id: DisasterId
  readonly displayName: string
  readonly displayNameZh: string
  readonly trigger: PredicateNode
  readonly baseProbabilityBp: number
  readonly effects: readonly Effect[]
  readonly playerChoices: readonly DisasterChoice[]
  readonly durationMonths: number
  readonly historicalYearRange?: readonly [number, number]
}

export interface DisasterState {
  readonly realmId: RealmId
  readonly disasterId: DisasterId
  readonly siteId: SiteId
  readonly startedAtTick: number
  readonly status: 'awaiting_decision' | 'resolving' | 'resolved'
  readonly chosenChoiceId?: string
  readonly resolvedAtTick?: number
}

export interface TradeRoute {
  readonly id: TradeRouteId
  readonly fromSiteId: SiteId
  readonly toSiteId: SiteId
  readonly fromRealmId: RealmId
  readonly toRealmId: RealmId
  readonly establishedAtTick: number
  readonly baseIncomePerXun: number
  readonly status: 'active' | 'cut'
}

export interface FactionInfluenceState {
  readonly realmId: RealmId
  readonly influences: ReadonlyMap<FactionId, number>
}

export interface FactionImbalanceEvent {
  readonly id: FactionImbalanceEventId
  readonly kind: 'coup' | 'split' | 'overthrow'
  readonly triggerPredicate: PredicateNode
  readonly effects: readonly Effect[]
  readonly cooldownYears: number
  readonly displayNameZh: string
}

export interface TraitEffect {
  readonly manpowerCapMultiplierBp?: number
  readonly taxIncomeMultiplierBp?: number
  readonly foodProductionMultiplierBp?: number
  readonly recruitmentSpeedMultiplierBp?: number
  readonly generalRecruitmentWeightBp?: number
  readonly combatPowerMultiplierBp?: number
  readonly disasterResistanceMultiplierBp?: number
  readonly tradeIncomeMultiplierBp?: number
  readonly factionStabilityBonusBp?: number
  readonly ideologyDeltaBp?: Partial<Record<Ideology, number>>
}

export interface TraitModifiers {
  readonly manpowerCapMultiplierBp: number
  readonly taxIncomeMultiplierBp: number
  readonly foodProductionMultiplierBp: number
  readonly recruitmentSpeedMultiplierBp: number
  readonly generalRecruitmentWeightBp: number
  readonly combatPowerMultiplierBp: number
  readonly disasterResistanceMultiplierBp: number
  readonly tradeIncomeMultiplierBp: number
  readonly factionStabilityBonusBp: number
  readonly ideologyDeltaBp?: Partial<Record<Ideology, number>>
}
