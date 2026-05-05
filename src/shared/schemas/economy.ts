import { z } from 'zod'
import { ArmyIdSchema, RealmIdSchema, SiteIdSchema } from './core'
import { PostSchema } from './character'
import { PeaceTermSchema } from './diplomacy'

export const EdictIdSchema = z.string().min(1)

export const RealmEconomySchema = z.object({
  treasury: z.number().int().nonnegative(),
  foodStores: z.number().int().nonnegative(),
  taxRate: z.number().int().min(0).max(50),
})

export const SiteEconomySchema = z.object({
  population: z.number().int().nonnegative(),
  households: z.number().int().nonnegative(),
  taxBase: z.number().int().nonnegative(),
  foodProduction: z.number().int().nonnegative(),
})

export const EdictKindSchema = z.enum(['edict_tax_relief', 'edict_grain_reserve'])
export const EdictStatusSchema = z.enum(['active', 'expired'])
export const GovernorModifierKindSchema = z.enum(['tax_efficiency', 'food_efficiency'])

export const EdictStateSchema = z.object({
  id: EdictIdSchema,
  realmId: RealmIdSchema,
  kind: EdictKindSchema,
  startedAtTick: z.number().int().nonnegative(),
  durationMonths: z.number().int().positive(),
  remainingMonths: z.number().int().nonnegative(),
  status: EdictStatusSchema,
})

export const GovernorAssignmentSchema = z.object({
  siteId: SiteIdSchema,
  realmId: RealmIdSchema,
  generalId: z.string().min(1),
  assignedAtTick: z.number().int().nonnegative(),
  modifierKind: GovernorModifierKindSchema,
}).strict()

export const OrderTypeSchema = z.enum([
  'march',
  'declareWarAndMarch',
  'declare-war',
  'propose-peace',
  'activate-edict',
  'assign-governor',
  'assign-post',
  'unassign-post',
])

const MarchOrderSchema = z.object({
  type: z.literal('march'),
  armyId: ArmyIdSchema,
  targetSiteId: SiteIdSchema,
})

const DeclareWarOrderSchema = z.object({
  type: z.literal('declare-war'),
  targetRealmId: RealmIdSchema,
  casusBelli: z.string().optional(),
})

const DeclareWarAndMarchOrderSchema = z.object({
  type: z.literal('declareWarAndMarch'),
  armyId: ArmyIdSchema,
  targetSiteId: SiteIdSchema,
})

const ProposePeaceOrderSchema = z.object({
  type: z.literal('propose-peace'),
  peaceProposalData: z.object({
    proposalId: z.string().min(1),
    proposingRealmId: RealmIdSchema,
    targetRealmId: RealmIdSchema,
    terms: z.array(PeaceTermSchema).max(3),
  }),
})

const ActivateEdictOrderSchema = z.object({
  type: z.literal('activate-edict'),
  edictId: EdictIdSchema,
  realmId: RealmIdSchema,
  kind: EdictKindSchema,
  durationMonths: z.number().int().positive(),
})

const AssignGovernorOrderSchema = z.object({
  type: z.literal('assign-governor'),
  siteId: SiteIdSchema,
  generalId: z.string().min(1),
})

const AssignPostOrderSchema = z.object({
  type: z.literal('assign-post'),
  generalId: z.string().min(1),
  post: PostSchema,
})

const UnassignPostOrderSchema = z.object({
  type: z.literal('unassign-post'),
  generalId: z.string().min(1),
  post: PostSchema,
})

export const OrderSchema = z.discriminatedUnion('type', [
  MarchOrderSchema,
  DeclareWarOrderSchema,
  DeclareWarAndMarchOrderSchema,
  ProposePeaceOrderSchema,
  ActivateEdictOrderSchema,
  AssignGovernorOrderSchema,
  AssignPostOrderSchema,
  UnassignPostOrderSchema,
])
