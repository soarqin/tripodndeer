import { z } from 'zod'

const GameDateSchema = z.object({
  yearBC: z.number().int(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']),
  month: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  xun: z.enum(['shang', 'zhong', 'xia']),
})

export const TutorialStepIdSchema = z.enum(['panel-tour', 'diplomacy-ju', 'declare-march', 'siege-capture', 'peace-annex'])
export const PanelIdSchema = z.enum(['realm', 'army', 'diplomacy'])

export const TutorialStateSchema = z.object({
  currentStep: TutorialStepIdSchema.nullable(),
  completedSteps: z.set(TutorialStepIdSchema),
  startedAt: GameDateSchema,
  dismissedStepHints: z.set(TutorialStepIdSchema),
  panelsOpened: z.set(PanelIdSchema),
  timeoutHintShown: z.boolean(),
})

export const TutorialStepEntrySchema = z.object({
  id: TutorialStepIdSchema,
  titleZH: z.string(),
  descriptionZH: z.string(),
  completionPredicateId: z.string(),
  orderIndex: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
})

export const TutorialHintEntrySchema = z.object({
  stepId: TutorialStepIdSchema,
  titleZH: z.string(),
  bodyZH: z.string(),
  codexEntryId: z.string().optional(),
})
