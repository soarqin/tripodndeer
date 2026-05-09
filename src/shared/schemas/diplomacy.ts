import { z } from 'zod'
import {
  DIPLOMACY_ATTITUDE_MAX,
  DIPLOMACY_ATTITUDE_MIN,
  DIPLOMACY_TRUST_MAX,
  DIPLOMACY_TRUST_MIN,
} from '~/content/m2/balance'
import { RealmIdSchema, SiteIdSchema } from './core'
import { ZhouInvestitureRankSchema } from './events'

export const WarKeySchema = z.string().min(1)

export const CessionPayloadSchema = z.object({ siteIds: z.array(SiteIdSchema) })
export const IndemnityPayloadSchema = z.object({ amount: z.number().nonnegative() })
export const TributePayloadSchema = z.object({
  amountPerYear: z.number().nonnegative(),
  years: z.number().int().positive(),
})
export const PeaceTermSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cession'), payload: CessionPayloadSchema }),
  z.object({ type: z.literal('indemnity'), payload: IndemnityPayloadSchema }),
  z.object({ type: z.literal('tribute'), payload: TributePayloadSchema }),
])

const GameDateSchema = z.object({
  yearBC: z.number().int(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']),
  month: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  xun: z.enum(['shang', 'zhong', 'xia']),
})

export const PeaceProposalSchema = z.object({
  id: z.string().min(1),
  proposingRealmId: RealmIdSchema,
  targetRealmId: RealmIdSchema,
  terms: z.array(PeaceTermSchema).max(3),
  proposedAt: GameDateSchema,
  status: z.enum(['pending', 'accepted', 'rejected']),
  acknowledgedAt: GameDateSchema.nullable(),
})

export const RelationKeySchema = z.string().regex(/^[^_]+(?:_[^_]+)*__[^_]+(?:_[^_]+)*$/)
export const DiplomaticProposalIdSchema = z.string().min(1)
export const TreatyIdSchema = z.string().min(1)
export const DiplomacyEventIdSchema = z.string().min(1)
export const CoalitionIdSchema = z.string().min(1)

export const DiplomaticActionKindSchema = z.enum(['alliance', 'non_aggression', 'tribute', 'marriage', 'envoy', 'declare_war', 'peace'])
export const DiplomaticProposalStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'expired', 'cancelled'])
export const DiplomaticTreatyKindSchema = z.enum(['alliance', 'non_aggression', 'tribute', 'marriage', 'truce'])
export const DiplomaticTreatyStatusSchema = z.enum(['active', 'expired', 'cancelled', 'broken'])
export const DiplomacyEventKindSchema = z.enum([
  'proposal_created',
  'proposal_resolved',
  'treaty_created',
  'treaty_ended',
  'war_declared',
  'betrayal',
  'relation_changed',
  'coalition_changed',
  'zhou_investiture_changed',
  'combat_observed',
  'spy_caught',
])
export const DiplomacyEventReasonSchema = z.enum(['war_declaration_against_treaty'])
export const CoalitionStatusSchema = z.enum(['forming', 'active', 'dissolved'])

export const DiplomaticRelationSchema = z.object({
  key: RelationKeySchema,
  realmAId: RealmIdSchema,
  realmBId: RealmIdSchema,
  attitude: z.number().int().min(DIPLOMACY_ATTITUDE_MIN).max(DIPLOMACY_ATTITUDE_MAX),
  trust: z.number().int().min(DIPLOMACY_TRUST_MIN).max(DIPLOMACY_TRUST_MAX),
  updatedAt: GameDateSchema,
})

export const DiplomaticProposalSchema = z.object({
  id: DiplomaticProposalIdSchema,
  kind: DiplomaticActionKindSchema,
  proposingRealmId: RealmIdSchema,
  targetRealmId: RealmIdSchema,
  status: DiplomaticProposalStatusSchema,
  proposedAt: GameDateSchema,
  proposedAtTick: z.number().int().nonnegative(),
  expiresAt: GameDateSchema,
  expiresAtTick: z.number().int().nonnegative(),
  resolvedAt: GameDateSchema.nullable(),
  resolvedAtTick: z.number().int().nonnegative().nullable(),
  treatyId: TreatyIdSchema.nullable(),
})

export const TreatySchema = z.object({
  id: TreatyIdSchema,
  kind: DiplomaticTreatyKindSchema,
  realmAId: RealmIdSchema,
  realmBId: RealmIdSchema,
  status: DiplomaticTreatyStatusSchema,
  signedAt: GameDateSchema,
  signedAtTick: z.number().int().nonnegative(),
  expiresAt: GameDateSchema.nullable(),
  expiresAtTick: z.number().int().nonnegative().nullable(),
  endedAt: GameDateSchema.nullable(),
  endedAtTick: z.number().int().nonnegative().nullable(),
  sourceProposalId: DiplomaticProposalIdSchema.nullable(),
})

export const DiplomacyEventSchema = z.object({
  id: DiplomacyEventIdSchema,
  kind: DiplomacyEventKindSchema,
  occurredAt: GameDateSchema,
  actorRealmId: RealmIdSchema.nullable(),
  targetRealmId: RealmIdSchema.nullable(),
  proposalId: DiplomaticProposalIdSchema.optional(),
  treatyId: TreatyIdSchema.optional(),
  treatyKind: DiplomaticTreatyKindSchema.optional(),
  relationKey: RelationKeySchema.optional(),
  coalitionId: CoalitionIdSchema.optional(),
  reason: DiplomacyEventReasonSchema.optional(),
  combatPayload: z.object({
    armySizeTotal: z.number().int().nonnegative(),
    borderSite: z.boolean(),
    victorRealmId: RealmIdSchema,
  }).optional(),
  spyMissionId: z.string().min(1).optional(),
})

export const CoalitionStateSchema = z.object({
  id: CoalitionIdSchema,
  targetRealmId: RealmIdSchema,
  memberRealmIds: z.array(RealmIdSchema),
  status: CoalitionStatusSchema,
  formedAt: GameDateSchema,
  dissolvedAt: GameDateSchema.nullable(),
})

export const ZhouInvestitureStateSchema = z.object({
  realmId: RealmIdSchema,
  recognizedTitle: z.string().min(1),
  grantedAtTick: z.number().int().nonnegative(),
  expiresAtTick: z.number().int().nonnegative().nullable(),
  source: z.literal('zhou'),
  rank: ZhouInvestitureRankSchema.optional(),
  lastTributeTick: z.number().int().nonnegative().optional(),
})
