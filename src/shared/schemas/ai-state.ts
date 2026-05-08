import { z } from 'zod'
import { ArmyIdSchema, RealmIdSchema, SiteIdSchema } from './core'

export const OperationalDirectiveKindSchema = z.enum([
  'declare_war',
  'dispatch_army',
  'support_front',
  'retreat',
  'diplomacy',
  'espionage',
])

export const StrategicPlanSchema = z.object({
  targetSiteId: SiteIdSchema.nullable(),
  mainEnemyRealmId: RealmIdSchema.nullable(),
  mainAllyRealmId: RealmIdSchema.nullable(),
  reformIntentId: z.string().min(1).nullable(),
  decidedAtTick: z.number(),
  decidedForYearBC: z.number(),
})

export const OperationalDirectiveSchema = z.object({
  id: z.string().min(1),
  kind: OperationalDirectiveKindSchema,
  priority: z.number(),
  targetRealmId: RealmIdSchema.optional(),
  targetSiteId: SiteIdSchema.optional(),
  armyId: ArmyIdSchema.optional(),
  createdAtTick: z.number(),
  expiresAtTick: z.number(),
})

export const AIStateSchema = z.object({
  strategic: StrategicPlanSchema.nullable(),
  operational: z.array(OperationalDirectiveSchema).readonly(),
})
