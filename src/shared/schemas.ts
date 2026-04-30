import { z } from 'zod'

export const SiteIdSchema = z.string().min(1)
export const RealmIdSchema = z.string().min(1)
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

export const OrderTypeSchema = z.enum(['march', 'declareWarAndMarch', 'declare-war', 'propose-peace'])

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

export const OrderSchema = z.discriminatedUnion('type', [
  MarchOrderSchema,
  DeclareWarOrderSchema,
  DeclareWarAndMarchOrderSchema,
  ProposePeaceOrderSchema,
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

export const GeneralSchema = z.object({
  id: z.string().min(1),
  realmId: RealmIdSchema,
  name: z.string().min(1),
  might: z.number().int().min(1).max(30),
  command: z.number().int().positive(),
  loyalty: z.number().int().min(0).max(100),
  strategy: z.number().optional(),
  learning: z.number().optional(),
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
})

export type M1DataV2 = z.infer<typeof M1DataSchemaV2>

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
  generals: z.instanceof(Map),
  passes: z.instanceof(Map),
  adjacencyEdges: z.instanceof(Map),
  sieges: z.instanceof(Map),
  playerRealmId: z.string(),
  rngState: z.object({ seed: z.number(), counter: z.number() }),
  phases: z.array(z.function()),
  pendingOrders: z.array(z.any()),
})

export type M0DataSchemaType = z.infer<typeof M0DataSchema>
