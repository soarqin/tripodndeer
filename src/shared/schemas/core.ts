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
export const IdeologySchema = z.enum(['fa', 'ru', 'dao', 'mo', 'zonghen', 'bing'])
export const IdeologyLeanSchema = z.object({
  fa: z.number().int().min(0).max(100),
  ru: z.number().int().min(0).max(100),
  dao: z.number().int().min(0).max(100),
  mo: z.number().int().min(0).max(100),
  zonghen: z.number().int().min(0).max(100),
  bing: z.number().int().min(0).max(100),
})

export const CulturalTagSchema = z.enum([
  'chinese_qin',
  'chinese_chu',
  'chinese_qi',
  'chinese_zhou_central',
  'chinese_yan',
  'chinese_zhao',
  'chinese_wei',
  'chinese_han',
  'yi_dong',
  'di_xirong',
])

export const RawSiteSchema = z.object({
  id: SiteIdSchema,
  name: z.string().min(1),
  position: Vec2Schema,
  boundary: z.array(BoundaryRefSchema).min(3),
  terrainType: TerrainTypeSchema.optional(),
  cultural: CulturalTagSchema.optional(),
  culturalIdentityStrength: z.number().min(0).max(100).optional(),
  lastConquestTick: z.number().int().nonnegative().nullable().optional(),
  lowIdentitySinceTick: z.number().int().nonnegative().nullable().optional(),
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

export const AdjacencyEdgeSchema = z.object({
  id: z.string().min(1),
  fromSiteId: SiteIdSchema,
  toSiteId: SiteIdSchema,
  passId: z.string().min(1),
})

export const SiteOccupationSchema = z.object({
  occupierId: RealmIdSchema,
  controlLevel: z.number().int().min(0).max(100),
})
