import { z } from 'zod'
import { IdeologySchema, RealmIdSchema, SiteIdSchema } from './core'
import { FactionIdSchema } from './character'
import { EffectSchema, PredicateNodeSchema } from './events'

export const DisasterIdSchema = z.string().min(1)
export const TradeRouteIdSchema = z.string().min(1)
export const FactionImbalanceEventIdSchema = z.string().min(1)

export const ReformChoiceSchema = z.object({
  id: z.string().min(1),
  labelZh: z.string().min(1),
  effects: z.array(EffectSchema),
  nextStageId: z.string().min(1).optional(),
  outcome: z.enum(['continue', 'success', 'failure']),
})

export const ReformStageSchema = z.object({
  id: z.string().min(1),
  textZh: z.string().min(1),
  choices: z.array(ReformChoiceSchema).min(2).max(4),
  advanceAfterMonths: z.number().int().positive(),
})

export const ReformDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  displayNameZh: z.string().min(1),
  trigger: PredicateNodeSchema,
  oneShot: z.literal(true),
  stages: z.array(ReformStageSchema).min(1).max(5),
  successTrait: z.string().min(1),
  failureTrait: z.string().min(1),
  historicalYearRange: z.tuple([z.number().int(), z.number().int()]).optional(),
})

export const ReformStateSchema = z.object({
  realmId: RealmIdSchema,
  reformId: z.string().min(1),
  currentStageId: z.string().min(1),
  startedAtTick: z.number().int().nonnegative(),
  stageEnteredAtTick: z.number().int().nonnegative(),
  status: z.enum(['in_progress', 'completed_success', 'completed_failure', 'paused']),
  choiceHistory: z.array(
    z.object({
      stageId: z.string().min(1),
      choiceId: z.string().min(1),
      tick: z.number().int().nonnegative(),
    }),
  ),
})

export const DisasterChoiceSchema = z.object({
  id: z.string().min(1),
  labelZh: z.string().min(1),
  costType: z.enum(['treasury', 'foodStores', 'morale', 'none']),
  costAmount: z.number().int().nonnegative(),
  effects: z.array(EffectSchema),
  outcomeZh: z.string().min(1),
})

export const DisasterDefinitionSchema = z.object({
  id: DisasterIdSchema,
  displayName: z.string().min(1),
  displayNameZh: z.string().min(1),
  trigger: PredicateNodeSchema,
  baseProbabilityBp: z.number().int().nonnegative(),
  effects: z.array(EffectSchema),
  playerChoices: z.array(DisasterChoiceSchema).min(4).max(4),
  durationMonths: z.number().int().positive(),
  historicalYearRange: z.tuple([z.number().int(), z.number().int()]).optional(),
})

export const DisasterStateSchema = z.object({
  realmId: RealmIdSchema,
  disasterId: DisasterIdSchema,
  siteId: SiteIdSchema,
  startedAtTick: z.number().int().nonnegative(),
  status: z.enum(['awaiting_decision', 'resolving', 'resolved']),
  chosenChoiceId: z.string().optional(),
  resolvedAtTick: z.number().int().nonnegative().optional(),
})

export const TradeRouteSchema = z.object({
  id: TradeRouteIdSchema,
  fromSiteId: SiteIdSchema,
  toSiteId: SiteIdSchema,
  fromRealmId: RealmIdSchema,
  toRealmId: RealmIdSchema,
  establishedAtTick: z.number().int().nonnegative(),
  baseIncomePerXun: z.number().int().positive(),
  status: z.enum(['active', 'cut']),
})

export const FactionInfluenceStateSchema = z.object({
  realmId: RealmIdSchema,
  influences: z.record(FactionIdSchema, z.number().min(0).max(100)),
})

export const FactionImbalanceEventSchema = z.object({
  id: FactionImbalanceEventIdSchema,
  kind: z.enum(['coup', 'split', 'overthrow']),
  triggerPredicate: PredicateNodeSchema,
  effects: z.array(EffectSchema),
  cooldownYears: z.number().int().positive(),
  displayNameZh: z.string().min(1),
})

export const TraitEffectSchema = z.object({
  manpowerCapMultiplierBp: z.number().int().optional(),
  taxIncomeMultiplierBp: z.number().int().optional(),
  foodProductionMultiplierBp: z.number().int().optional(),
  recruitmentSpeedMultiplierBp: z.number().int().optional(),
  generalRecruitmentWeightBp: z.number().int().optional(),
  combatPowerMultiplierBp: z.number().int().optional(),
  disasterResistanceMultiplierBp: z.number().int().optional(),
  tradeIncomeMultiplierBp: z.number().int().optional(),
  factionStabilityBonusBp: z.number().int().optional(),
  ideologyDeltaBp: z.record(IdeologySchema, z.number()).optional(),
})
