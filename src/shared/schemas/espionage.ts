import { z } from 'zod'
import { RealmIdSchema } from './core'

export const EspionageActionKindSchema = z.enum(['reconnaissance', 'rumor', 'discord', 'counter_intel'])

export const CoverageKeySchema = z.string().regex(/^[^_]+(?:_[^_]+)*__[^_]+(?:_[^_]+)*$/)

export const SpyMissionStatusSchema = z.enum(['in_progress', 'success', 'failed', 'exposed', 'cancelled'])

export const SpyMissionSchema = z.object({
  id: z.string().min(1),
  spyGeneralId: z.string().min(1),
  spyRealmId: RealmIdSchema,
  targetRealmId: RealmIdSchema,
  action: EspionageActionKindSchema,
  startTick: z.number().int().nonnegative(),
  resolveTick: z.number().int().nonnegative(),
  status: SpyMissionStatusSchema,
  targetGeneralId: z.string().min(1).nullable(),
})

export const CounterIntelStateSchema = z.object({
  realmId: RealmIdSchema,
  detectionLevel: z.number().int().min(0).max(10),
  lastUpdatedTick: z.number().int().nonnegative(),
})
