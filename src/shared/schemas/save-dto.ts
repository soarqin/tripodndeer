import { z } from 'zod'

import { SAVE_DTO_VERSION } from '~/shared/types/save-dto'
import { RulerPersonalityProfileSchema, PersonalityArchetypeSchema } from './character'
import { DifficultyTierSchema } from './difficulty'

const keyValueTuple = z.tuple([z.string().min(1), z.unknown()])
const numericKeyValueTuple = z.tuple([z.string().min(1), z.number()])

export const SerializedFactionInfluenceSchema = z.object({
  realmId: z.string().min(1),
  influences: z.array(numericKeyValueTuple),
})

export const SerializedRulerStateSchema = z
  .object({
    realmId: z.string().min(1),
    generalId: z.string().min(1),
    age: z.number().int().nonnegative(),
    lifespan: z.number().int().positive(),
    health: z.number().int().min(0).max(100),
    personality: PersonalityArchetypeSchema,
    personalityDims: RulerPersonalityProfileSchema.optional(),
    successionLawId: z.literal('primogeniture'),
    inOfficeSinceTick: z.number().int().nonnegative(),
  })
  .passthrough()

export const SerializedWorldSchema = z.object({
  date: z.unknown(),
  tick: z.number().int().nonnegative(),
  difficulty: DifficultyTierSchema.optional(),
  sites: z.array(keyValueTuple),
  realms: z.array(keyValueTuple),
  armies: z.array(keyValueTuple),
  edges: z.array(keyValueTuple),
  wars: z.array(keyValueTuple),
  peaceProposals: z.array(keyValueTuple),
  relations: z.array(keyValueTuple),
  diplomaticProposals: z.array(keyValueTuple),
  treaties: z.array(keyValueTuple),
  diplomacyHistory: z.array(z.unknown()),
  diplomaticMemory: z.array(keyValueTuple).optional(),
  coalitions: z.array(keyValueTuple),
  zhouInvestiture: z.array(keyValueTuple),
  generals: z.array(keyValueTuple),
  rulers: z.array(z.tuple([z.string().min(1), SerializedRulerStateSchema])),
  academies: z.array(keyValueTuple),
  eventChainStates: z.array(keyValueTuple),
  reformStates: z.array(keyValueTuple),
  disasterStates: z.array(keyValueTuple),
  tradeRoutes: z.array(keyValueTuple),
  factionInfluences: z.array(z.tuple([z.string().min(1), SerializedFactionInfluenceSchema])),
  passes: z.array(keyValueTuple),
  adjacencyEdges: z.array(keyValueTuple),
  sieges: z.array(keyValueTuple),
  edicts: z.array(keyValueTuple),
  governorAssignments: z.array(keyValueTuple),
  intelligenceCoverage: z.array(numericKeyValueTuple),
  spyMissions: z.array(keyValueTuple),
  counterIntelStates: z.array(keyValueTuple),
  provinces: z.array(keyValueTuple),
  regions: z.array(keyValueTuple),
  characterTemplates: z.array(keyValueTuple),
  localization: z.array(z.tuple([z.string(), z.string()])),
  playerRealmId: z.string().min(1),
  rngState: z.object({ seed: z.number(), counter: z.number().int().nonnegative() }),
  pendingOrders: z.array(z.unknown()),
  aiState: z.array(keyValueTuple).optional(),
})

export const SaveDTOSchema = z.object({
  schemaVersion: z.literal(SAVE_DTO_VERSION),
  scenarioId: z.enum(['m1', 'm9']),
  createdAt: z.number().int().nonnegative(),
  world: SerializedWorldSchema,
})
