import { z } from 'zod'
import { RealmIdSchema } from './core'

export const AcademyIdSchema = z.string().min(1)

export const SpecialtySchema = z.enum([
  'commander',
  'warrior',
  'strategist',
  'administrator',
  'reformer',
  'diplomat',
  'spy',
  'scholar',
  'engineer',
])

export const AmbitionSchema = z.enum(['low', 'mid', 'high'])

export const LoyaltyStateSchema = z.enum([
  'loyal',
  'shirking',
  'seeking_departure',
  'secret_contact',
  'defected',
])

export const PersonalityArchetypeSchema = z.enum([
  'conqueror',
  'steward',
  'schemer',
  'learned',
  'tyrant',
  'incompetent',
  'benevolent',
  'builder',
])

export const FactionIdSchema = z.enum([
  'royal_kin',
  'noble_clans',
  'military_meritocracy',
  'reformists',
  'conservatives',
  'foreign_clients',
])

export const GeneralAttrsSchema = z.object({
  wu: z.number().int().min(0).max(20),
  zheng: z.number().int().min(0).max(20),
  jiao: z.number().int().min(0).max(20),
  mou: z.number().int().min(0).max(20),
  xue: z.number().int().min(0).max(20),
  po: z.number().int().min(0).max(20),
})

export const CharacterAttributesSchema = GeneralAttrsSchema

export const PostSchema = z.enum(['ruler', 'chancellor', 'general', 'governor'])

export const GeneralSchema = z.object({
  id: z.string().min(1),
  realmId: RealmIdSchema,
  name: z.string().min(1),
  might: z.number().int().min(1).max(30),
  command: z.number().int().positive(),
  loyalty: z.number().int().min(0).max(100),
  strategy: z.number().optional(),
  learning: z.number().optional(),
  attrs: GeneralAttrsSchema.optional(),
  specialty: SpecialtySchema.optional(),
  ambition: AmbitionSchema.optional(),
  faction: FactionIdSchema.optional(),
  age: z.number().int().nonnegative().optional(),
  recruitedAtTick: z.number().int().nonnegative().optional(),
  posts: z.array(PostSchema).optional(),
  loyaltyState: LoyaltyStateSchema.optional(),
  almaMater: AcademyIdSchema.optional(),
})

export const RulerStateSchema = z.object({
  realmId: RealmIdSchema,
  generalId: z.string().min(1),
  age: z.number().int().nonnegative(),
  lifespan: z.number().int().positive(),
  health: z.number().int().min(0).max(100),
  personality: PersonalityArchetypeSchema,
  successionLawId: z.literal('primogeniture'),
  inOfficeSinceTick: z.number().int().nonnegative().default(0),
})

export const AIPersonalitySchema = z.enum(['aggressive_random', 'aggressive', 'cautious'] as const)
