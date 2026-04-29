import { z } from 'zod'

export const SiteIdSchema = z.string().min(1)
export const FactionIdSchema = z.string().min(1)
export const Vec2Schema = z.tuple([z.number(), z.number()]) as z.ZodType<readonly [number, number]>
export const PolygonSchema = z.array(Vec2Schema).min(3)

export const RawSiteSchema = z.object({
  id: SiteIdSchema,
  name: z.string().min(1),
  position: Vec2Schema,
  polygon: PolygonSchema,
  adjacency: z.array(SiteIdSchema),
})

export const FactionSchema = z.object({
  id: FactionIdSchema,
  displayName: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

// 对应 sites.json 的根结构
export const M0DataSchema = z.object({
  sites: z.array(RawSiteSchema),
  factions: z.array(FactionSchema),
  initialOwnership: z.record(z.string(), FactionIdSchema),
})

export type M0DataSchemaType = z.infer<typeof M0DataSchema>
