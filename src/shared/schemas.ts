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

export const RawSiteSchema = z.object({
  id: SiteIdSchema,
  name: z.string().min(1),
  position: Vec2Schema,
  boundary: z.array(BoundaryRefSchema).min(3),
})

export const ArmyTemplateSchema = z.object({
  id: ArmyIdSchema,
  manpower: z.number().int().positive(),
  location: SiteIdSchema,
})

export const ArmyStateSchema = z.enum(['idle', 'marching', 'retreating'])

export const ArmySchema = z.object({
  id: ArmyIdSchema,
  realmId: z.string().min(1),
  manpower: z.number().int().nonnegative(),
  location: SiteIdSchema,
  state: ArmyStateSchema,
  destination: SiteIdSchema.nullable(),
  ticksRemaining: z.number().int().nonnegative(),
  source: SiteIdSchema.nullable(),
})

export const OrderTypeSchema = z.enum(['march', 'declareWarAndMarch'])

export const OrderSchema = z.object({
  type: OrderTypeSchema,
  armyId: ArmyIdSchema,
  targetSiteId: SiteIdSchema,
})

export const WarKeySchema = z.string().min(1)

export const RealmSchema = z.object({
  id: RealmIdSchema,
  displayName: z.string().min(1),
  fullTitle: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  capital: SiteIdSchema,
  initialSites: z.array(SiteIdSchema),
  initialArmies: z.array(ArmyTemplateSchema),
  aiPersonality: z.literal('aggressive_random'),
})

export const M0DataSchema = z.object({
  edges: z.record(z.string(), MapEdgeSchema),
  sites: z.array(RawSiteSchema),
  realms: z.array(RealmSchema),
  initialOwnership: z.record(z.string(), RealmIdSchema),
})

export type M0DataSchemaType = z.infer<typeof M0DataSchema>
