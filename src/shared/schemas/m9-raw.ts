import { z } from 'zod'
import {
  IdeologyLeanSchema,
  RealmIdSchema,
  SiteIdSchema,
  TerrainTypeSchema,
} from './core'
import {
  CharacterAttributesSchema,
  PersonalityArchetypeSchema,
  SpecialtySchema,
} from './character'
import {
  CharIdSchema,
  ProvinceIdSchema,
  RegionIdSchema,
} from './world'

export const M9RawRealmSchema = z.object({
  id: RealmIdSchema,
  name: z.string().min(1),
  full_title: z.string().min(1),
  capital: SiteIdSchema,
  status: z.enum(['active', 'deactivated']),
  archetype: PersonalityArchetypeSchema,
  rulingHouse: z.string(),
  ideology_lean: IdeologyLeanSchema,
  starting_treasury: z.number().nonnegative(),
  starting_manpower: z.number().nonnegative(),
  realm_traits: z.array(z.string()),
})

export const M9RawSiteEconomySchema = z.object({
  agri: z.number().int().nonnegative(),
  craft: z.number().int().nonnegative(),
  trade: z.number().int().nonnegative(),
})

export const M9RawSiteSchema = z.object({
  id: SiteIdSchema,
  name: z.string().min(1),
  type: z.string().min(1),
  regionId: RegionIdSchema,
  provinceId: ProvinceIdSchema,
  position: z.tuple([z.number(), z.number()]),
  terrain: TerrainTypeSchema,
  defense_value: z.number().int().min(0).max(10),
  population_base: z.number().int().nonnegative(),
  economy: M9RawSiteEconomySchema,
  cultural: z.string().min(1),
  historical_owner: RealmIdSchema,
  historicalNotes: z.string(),
})

export const M9RawProvinceSchema = z.object({
  id: ProvinceIdSchema,
  name: z.string().min(1),
  regionId: RegionIdSchema,
  realmId: RealmIdSchema,
  siteIds: z.array(SiteIdSchema),
  historicalCapital: SiteIdSchema.optional(),
  historicalNotes: z.string(),
})

export const M9RawRegionSchema = z.object({
  id: RegionIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  provinceIds: z.array(ProvinceIdSchema),
})

export const M9RawCharacterTemplateSchema = z.object({
  id: CharIdSchema,
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  realmId: RealmIdSchema,
  birthYearBC: z.number().int(),
  deathYearBC: z.number().int().nullable(),
  birthplace: z.string().min(1),
  specialty: SpecialtySchema,
  attributes: CharacterAttributesSchema,
  historicalNotes: z.string(),
  source: z.enum(['史记', '战国策', '左传', '其他', 'approximated']),
  aliases: z.array(z.string()).optional(),
})

// M9 JSON `passes` is heterogeneous: descriptive entries (no edgeId) plus
// runtime entries (with edgeId/defenseBonus/controllerId/fortification).
// We accept both shapes here; the mapper filters to runtime-shaped passes only.

const M9RawDescriptivePassSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  controls_edges: z.array(z.string()),
  default_owner: RealmIdSchema,
  fortification_base: z.number().int().nonnegative(),
  terrain_bonus: z.number(),
  flank_difficulty: z.number(),
  historical_significance: z.string(),
  historicalNotes: z.string(),
})

const M9RawRuntimePassSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  edgeId: z.string().min(1),
  defenseBonus: z.number().min(0).max(1),
  controllerId: RealmIdSchema,
  fortification: z.number().int().min(0).max(100),
})

export const M9RawPassSchema = z.union([M9RawRuntimePassSchema, M9RawDescriptivePassSchema])

export const M9RawDataSchema = z.object({
  schema_version: z.literal(8),
  meta: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    start_year_bc: z.number().int().positive(),
    end_year_bc: z.number().int().positive(),
    playable_realms: z.array(RealmIdSchema),
  }),
  realms: z.array(M9RawRealmSchema),
  sites: z.array(M9RawSiteSchema),
  passes: z.array(M9RawPassSchema),
  provinces: z.array(M9RawProvinceSchema),
  regions: z.array(M9RawRegionSchema),
  characterTemplates: z.array(M9RawCharacterTemplateSchema),
  generals: z.array(z.unknown()),
  armies: z.array(z.unknown()),
  wars: z.record(z.string(), z.unknown()),
  edges: z.array(z.unknown()),
  adjacencyEdges: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]),
})

export type M9RawData = z.infer<typeof M9RawDataSchema>
export type M9RawRealm = z.infer<typeof M9RawRealmSchema>
export type M9RawSite = z.infer<typeof M9RawSiteSchema>
export type M9RawProvince = z.infer<typeof M9RawProvinceSchema>
export type M9RawRegion = z.infer<typeof M9RawRegionSchema>
export type M9RawCharacterTemplate = z.infer<typeof M9RawCharacterTemplateSchema>
export type M9RawPass = z.infer<typeof M9RawPassSchema>
