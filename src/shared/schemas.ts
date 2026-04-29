import { z } from 'zod'

export const SiteIdSchema = z.string().min(1)
export const FactionIdSchema = z.string().min(1)
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

export const FactionSchema = z.object({
  id: FactionIdSchema,
  displayName: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export const M0DataSchema = z.object({
  edges: z.record(z.string(), MapEdgeSchema),
  sites: z.array(RawSiteSchema),
  factions: z.array(FactionSchema),
  initialOwnership: z.record(z.string(), FactionIdSchema),
})

export type M0DataSchemaType = z.infer<typeof M0DataSchema>
