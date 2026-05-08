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
  PassSchema,
  ProvinceIdSchema,
  RegionIdSchema,
  RealmStatusSchema,
} from './world'

export const M9DataMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startYearBC: z.number().int().positive(),
  endYearBC: z.number().int().positive(),
  playableRealms: z.array(RealmIdSchema),
})

export const M9DataRealmSchema = z.object({
  id: RealmIdSchema,
  displayName: z.string().min(1),
  fullTitle: z.string().min(1),
  capital: SiteIdSchema,
  status: RealmStatusSchema,
  archetypePersonality: PersonalityArchetypeSchema,
  rulingHouse: z.string(),
  ideologyLean: IdeologyLeanSchema,
  startingTreasury: z.number().nonnegative(),
  startingManpower: z.number().nonnegative(),
  traits: z.array(z.string()),
})

export const M9DataSiteEconomySchema = z.object({
  agri: z.number().int().nonnegative(),
  craft: z.number().int().nonnegative(),
  trade: z.number().int().nonnegative(),
})

export const M9DataSiteSchema = z.object({
  id: SiteIdSchema,
  name: z.string().min(1),
  type: z.string().min(1),
  regionId: RegionIdSchema,
  provinceId: ProvinceIdSchema,
  position: z.tuple([z.number(), z.number()]),
  terrain: TerrainTypeSchema,
  defenseValue: z.number().int().min(0).max(10),
  populationBase: z.number().int().nonnegative(),
  economy: M9DataSiteEconomySchema,
  cultural: z.string().min(1),
  historicalOwner: RealmIdSchema,
  historicalNotes: z.string(),
})

export const M9DataProvinceSchema = z.object({
  id: ProvinceIdSchema,
  name: z.string().min(1),
  regionId: RegionIdSchema,
  realmId: RealmIdSchema,
  siteIds: z.array(SiteIdSchema).readonly(),
  historicalCapital: SiteIdSchema.optional(),
  historicalNotes: z.string(),
})

export const M9DataRegionSchema = z.object({
  id: RegionIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  provinceIds: z.array(ProvinceIdSchema).readonly(),
})

export const M9DataCharacterTemplateSchema = z.object({
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
  aliases: z.array(z.string()).readonly().optional(),
})

export const M9DataSchema = z.object({
  meta: M9DataMetaSchema,
  realms: z.array(M9DataRealmSchema),
  sites: z.array(M9DataSiteSchema),
  passes: z.array(PassSchema),
  provinces: z.array(M9DataProvinceSchema),
  regions: z.array(M9DataRegionSchema),
  characterTemplates: z.array(M9DataCharacterTemplateSchema),
})

export type M9Data = z.infer<typeof M9DataSchema>
export type M9DataRealm = z.infer<typeof M9DataRealmSchema>
export type M9DataSite = z.infer<typeof M9DataSiteSchema>
export type M9DataProvince = z.infer<typeof M9DataProvinceSchema>
export type M9DataRegion = z.infer<typeof M9DataRegionSchema>
export type M9DataCharacterTemplate = z.infer<typeof M9DataCharacterTemplateSchema>
