import { z } from 'zod'
import {
  DIPLOMACY_ATTITUDE_MAX,
  DIPLOMACY_ATTITUDE_MIN,
  DIPLOMACY_TRUST_MAX,
  DIPLOMACY_TRUST_MIN,
} from '~/content/m2/balance'

export const SiteIdSchema = z.string().min(1)
export const RealmIdSchema = z.string().min(1)
export const EdictIdSchema = z.string().min(1)
export const ArmyIdSchema = z.string().min(1)
export const Vec2Schema = z.tuple([z.number(), z.number()]) as z.ZodType<readonly [number, number]>
export const PolygonSchema = z.array(Vec2Schema).min(3)
export const EdgeIdSchema = z.string().min(1)

export const MapEdgeSchema = z
  .object({
    id: EdgeIdSchema,
    curveType: z.enum(['polyline', 'cubic-bezier', 'catmull-rom']),
    travel_cost: z.number().int().min(1).max(10),
    anchors: z.array(Vec2Schema).min(2),
    controls: z.array(z.tuple([Vec2Schema, Vec2Schema])).optional(),
  })
  .superRefine((edge, ctx) => {
    if (edge.curveType === 'cubic-bezier') {
      if (!edge.controls || edge.controls.length !== edge.anchors.length - 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'cubic-bezier requires controls.length === anchors.length - 1',
        })
      }
    }
  })

export const BoundaryRefSchema = z.object({
  edge: EdgeIdSchema,
  reverse: z.boolean(),
})

export const TerrainTypeSchema = z.enum(['plains', 'hills', 'mountains', 'forest', 'swamp', 'grassland', 'desert'])

export const RawSiteSchema = z.object({
  id: SiteIdSchema,
  name: z.string().min(1),
  position: Vec2Schema,
  boundary: z.array(BoundaryRefSchema).min(3),
  terrainType: TerrainTypeSchema.optional(),
})

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

export const ArmyTemplateSchema = z.object({
  id: ArmyIdSchema,
  manpower: z.number().int().positive(),
  location: SiteIdSchema,
})

export const ArmyStateSchema = z.enum(['idle', 'marching', 'retreating', 'besieging', 'engaged', 'blocked'])

export const UnitTypeSchema = z.enum(['infantry', 'chariot', 'cavalry', 'crossbow'])

export const CompositionSchema = z.object({
  infantry: z.number().int().nonnegative(),
  chariot: z.number().int().nonnegative(),
  cavalry: z.number().int().nonnegative(),
  crossbow: z.number().int().nonnegative(),
})

export const ArmySchema = z.object({
  id: ArmyIdSchema,
  realmId: z.string().min(1),
  manpower: z.number().int().nonnegative(),
  location: SiteIdSchema,
  state: ArmyStateSchema,
  destination: SiteIdSchema.nullable(),
  ticksRemaining: z.number().int().nonnegative(),
  source: SiteIdSchema.nullable(),
  composition: CompositionSchema.optional(),
})

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

export const OrderTypeSchema = z.enum([
  'march',
  'declareWarAndMarch',
  'declare-war',
  'propose-peace',
  'activate-edict',
  'assign-governor',
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

export const OrderSchema = z.discriminatedUnion('type', [
  MarchOrderSchema,
  DeclareWarOrderSchema,
  DeclareWarAndMarchOrderSchema,
  ProposePeaceOrderSchema,
  ActivateEdictOrderSchema,
  AssignGovernorOrderSchema,
])

export const WarKeySchema = z.string().min(1)

export const RealmStatsSchema = z.object({
  manpowerPool: z.number().int().nonnegative(),
  manpowerCap: z.number().int().positive(),
  warWeariness: z.number().int().nonnegative(),
})

export const AdjacencyEdgeSchema = z.object({
  id: z.string().min(1),
  fromSiteId: SiteIdSchema,
  toSiteId: SiteIdSchema,
  passId: z.string().min(1),
})

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

export const PostSchema = z.enum(['ruler', 'chancellor', 'general', 'governor'])

export const GeneralAttrsSchema = z.object({
  wu: z.number().int().min(0).max(20),
  zheng: z.number().int().min(0).max(20),
  jiao: z.number().int().min(0).max(20),
  mou: z.number().int().min(0).max(20),
  xue: z.number().int().min(0).max(20),
  po: z.number().int().min(0).max(20),
})

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
  posts: z.array(PostSchema).optional(),
  loyaltyState: LoyaltyStateSchema.optional(),
})

export const RulerStateSchema = z.object({
  realmId: RealmIdSchema,
  generalId: z.string().min(1),
  age: z.number().int().nonnegative(),
  lifespan: z.number().int().positive(),
  health: z.number().int().min(0).max(100),
  personality: PersonalityArchetypeSchema,
  successionLawId: z.literal('primogeniture'),
})

export const EffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('realm.treasury'), realmId: RealmIdSchema, delta: z.number() }),
  z.object({ type: z.literal('character.create'), generalId: z.string().min(1), realmId: RealmIdSchema, name: z.string().min(1) }),
  z.object({ type: z.literal('character.kill'), generalId: z.string().min(1) }),
  z.object({ type: z.literal('character.loyalty'), generalId: z.string().min(1), delta: z.number() }),
  z.object({ type: z.literal('realm.trait.add'), realmId: RealmIdSchema, trait: z.string().min(1) }),
])

export type Effect = z.infer<typeof EffectSchema>

export const EventChainChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  effects: z.array(EffectSchema),
  nextStageId: z.string().min(1).optional(),
})

export const EventChainStageSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  choices: z.array(EventChainChoiceSchema),
})

export const EventChainTriggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('date'),
    between: z.tuple([
      z.object({ yearBC: z.number().int() }),
      z.object({ yearBC: z.number().int() }),
    ]),
    realmId: RealmIdSchema.optional(),
  }),
  z.object({
    type: z.literal('state'),
    predicate: z.string().min(1),
  }),
])

export const EventChainSchema = z.object({
  id: z.string().min(1),
  trigger: EventChainTriggerSchema,
  oneShot: z.boolean(),
  stages: z.array(EventChainStageSchema).min(1),
})

export const EventChainStateSchema = z.object({
  id: z.string().min(1),
  currentStageId: z.string().min(1),
  completed: z.boolean(),
  startedAtTick: z.number().int().nonnegative(),
})

export const SiteOccupationSchema = z.object({
  occupierId: RealmIdSchema,
  controlLevel: z.number().int().min(0).max(100),
})

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

export const PassSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  edgeId: z.string().min(1),
  defenseBonus: z.number().min(0).max(1),
  controllerId: RealmIdSchema,
  fortification: z.number().int().min(0).max(100),
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
export const DiplomacyEventKindSchema = z.enum(['proposal_created', 'proposal_resolved', 'treaty_created', 'treaty_ended', 'war_declared', 'betrayal', 'relation_changed', 'coalition_changed', 'zhou_investiture_changed'])
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
  relationKey: RelationKeySchema.optional(),
  coalitionId: CoalitionIdSchema.optional(),
  reason: DiplomacyEventReasonSchema.optional(),
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
})

export const AIPersonalitySchema = z.enum(['aggressive_random', 'aggressive', 'cautious'] as const)

export const RealmSchema = z.object({
  id: RealmIdSchema,
  displayName: z.string().min(1),
  fullTitle: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  capital: SiteIdSchema,
  initialSites: z.array(SiteIdSchema),
  initialArmies: z.array(ArmyTemplateSchema),
  aiPersonality: AIPersonalitySchema,
  economy: RealmEconomySchema.default({ treasury: 0, foodStores: 0, taxRate: 10 }),
  rulerId: z.string().nullable().optional(),
})

export const M0DataSchema = z.object({
  edges: z.record(z.string(), MapEdgeSchema),
  sites: z.array(RawSiteSchema),
  realms: z.array(RealmSchema),
  initialOwnership: z.record(z.string(), RealmIdSchema),
})

// M1 Data Schema (for scenario.json validation)
export const M1DataSchema = z.object({
  edges: z.record(z.string(), MapEdgeSchema),
  sites: z.array(RawSiteSchema),
  realms: z.array(RealmSchema),
  schema_version: z.number().optional(),
  initialOwnership: z.record(z.string(), z.string()),
  initialArmies: z.array(ArmySchema),
  initialWars: z.array(z.object({ a: z.string(), b: z.string() })),
})

export type M1Data = z.infer<typeof M1DataSchema>

export const RealmSchemaV2 = RealmSchema.extend({
  stats: RealmStatsSchema.optional(),
})

export const M1DataSchemaV2 = M1DataSchema.extend({
  schema_version: z.literal(2),
  realms: z.array(RealmSchemaV2),
  generals: z.array(GeneralSchema).default([]),
  passes: z.array(PassSchema).default([]),
  adjacencyEdges: z.array(AdjacencyEdgeSchema).default([]),
  peaceProposals: z.array(PeaceProposalSchema).default([]),
  relations: z.array(DiplomaticRelationSchema).default([]),
  diplomaticProposals: z.array(DiplomaticProposalSchema).default([]),
  treaties: z.array(TreatySchema).default([]),
  diplomacyHistory: z.array(DiplomacyEventSchema).default([]),
  coalitions: z.array(CoalitionStateSchema).default([]),
  zhouInvestiture: z.array(ZhouInvestitureStateSchema).default([]),
})

export type M1DataV2 = z.infer<typeof M1DataSchemaV2>

export const M1DataSchemaV3 = M1DataSchemaV2.extend({
  schema_version: z.literal(3),
  rulers: z.array(RulerStateSchema).default([]),
  eventChainStates: z.array(EventChainStateSchema).default([]),
})

export type M1DataV3 = z.infer<typeof M1DataSchemaV3>

// World Schema (for runtime World validation)
export const WorldSchema = z.object({
  date: z.object({
    yearBC: z.number().int(),
    season: z.enum(['spring', 'summer', 'autumn', 'winter']),
    month: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    xun: z.enum(['shang', 'zhong', 'xia']),
  }),
  tick: z.number().int().nonnegative(),
  sites: z.instanceof(Map),
  realms: z.instanceof(Map),
  armies: z.instanceof(Map),
  edges: z.instanceof(Map),
  wars: z.instanceof(Map),
  peaceProposals: z.instanceof(Map),
  relations: z.instanceof(Map),
  diplomaticProposals: z.instanceof(Map),
  treaties: z.instanceof(Map),
  diplomacyHistory: z.array(DiplomacyEventSchema),
  coalitions: z.instanceof(Map),
  zhouInvestiture: z.instanceof(Map),
  generals: z.instanceof(Map),
  passes: z.instanceof(Map),
  adjacencyEdges: z.instanceof(Map),
  sieges: z.instanceof(Map),
  edicts: z.instanceof(Map),
  governorAssignments: z.instanceof(Map),
  playerRealmId: z.string(),
  rngState: z.object({ seed: z.number(), counter: z.number() }),
  phases: z.array(z.function()),
  pendingOrders: z.array(z.any()),
})

export type M0DataSchemaType = z.infer<typeof M0DataSchema>
