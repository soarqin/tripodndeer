import { z } from 'zod'
import { RealmIdSchema } from './core'

export const DiplomaticMemoryEventKindSchema = z.enum(['broken_alliance', 'broken_peace', 'spy_caught', 'unprovoked_war', 'battlefield_victory', 'border_skirmish'])

export const DiplomaticMemoryEventSchema = z.object({
  kind: DiplomaticMemoryEventKindSchema,
  tick: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
})

export const DiplomaticMemorySchema = z.object({
  observerId: RealmIdSchema,
  subjectId: RealmIdSchema,
  betrayalScore: z.number().nonnegative(),
  events: z.array(DiplomaticMemoryEventSchema),
  lastUpdatedTick: z.number().int().nonnegative(),
  lastObservedHistoryIdx: z.number().int().nonnegative(),
})
