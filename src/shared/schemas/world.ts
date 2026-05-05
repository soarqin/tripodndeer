import { z } from 'zod'
import {
  AdjacencyEdgeSchema,
  ArmySchema,
  ArmyTemplateSchema,
  IdeologyLeanSchema,
  IdeologySchema,
  MapEdgeSchema,
  RawSiteSchema,
  RealmIdSchema,
  SiteIdSchema,
} from './core'
import {
  AcademyIdSchema,
  AIPersonalitySchema,
  CharacterAttributesSchema,
  GeneralSchema,
  RulerStateSchema,
  SpecialtySchema,
} from './character'
import { RealmEconomySchema } from './economy'
import {
  CoalitionStateSchema,
  DiplomacyEventSchema,
  DiplomaticProposalSchema,
  DiplomaticRelationSchema,
  PeaceProposalSchema,
  TreatySchema,
  ZhouInvestitureStateSchema,
} from './diplomacy'
import {
  EventChainStateSchema,
  PoliticalSystemSchema,
} from './events'
import {
  DisasterStateSchema,
  FactionInfluenceStateSchema,
  ReformStateSchema,
  TradeRouteIdSchema,
  TradeRouteSchema,
} from './reform-disaster-trade'
import {
  CounterIntelStateSchema,
  CoverageKeySchema,
  SpyMissionSchema,
} from './espionage'

export const AcademyStatusSchema = z.enum(['active', 'dormant'])

export const AcademySchema = z.object({
  id: AcademyIdSchema,
  hostRealmId: RealmIdSchema,
  hostSiteId: SiteIdSchema,
  primaryIdeology: IdeologySchema,
  secondaryIdeology: IdeologySchema.nullable(),
  founded: z.number().int().positive(),
  level: z.literal(1),
  status: AcademyStatusSchema,
})

export const RealmStatsSchema = z.object({
  manpowerPool: z.number().int().nonnegative(),
  manpowerCap: z.number().int().positive(),
  warWeariness: z.number().int().nonnegative(),
})

export const PassSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  edgeId: z.string().min(1),
  defenseBonus: z.number().min(0).max(1),
  controllerId: RealmIdSchema,
  fortification: z.number().int().min(0).max(100),
})

export const RealmStatusSchema = z.enum(['active', 'deactivated'])

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
  traits: z.array(z.string()).default([]),
  politicalSystem: PoliticalSystemSchema.default('enfeoffment'),
  prestige: z.number().min(0).max(100).default(40),
  ideologyLean: IdeologyLeanSchema.default({ fa: 0, ru: 0, dao: 0, mo: 0, zonghen: 0, bing: 0 }),
  warVictoriesThisYear: z.number().int().nonnegative().default(0),
  status: RealmStatusSchema.optional(),
  rulingHouse: z.string().optional(),
})

export const M0DataSchema = z.object({
  edges: z.record(z.string(), MapEdgeSchema),
  sites: z.array(RawSiteSchema),
  realms: z.array(RealmSchema),
  initialOwnership: z.record(z.string(), RealmIdSchema),
})

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

export const M1DataSchemaV4 = M1DataSchemaV3.extend({
  schema_version: z.literal(4),
  reformStates: z.array(ReformStateSchema).default([]),
})

export type M1DataV4 = z.infer<typeof M1DataSchemaV4>

export const M1DataSchemaV5 = M1DataSchemaV4.extend({
  schema_version: z.literal(5),
  disasterStates: z.array(DisasterStateSchema).optional().default([]),
  tradeRoutes: z.array(TradeRouteSchema).optional().default([]),
  factionInfluences: z.array(FactionInfluenceStateSchema).optional().default([]),
})

export type M1DataV5 = z.infer<typeof M1DataSchemaV5>

export const M1DataSchemaV6 = M1DataSchemaV5.extend({
  schema_version: z.literal(6),
  academies: z.array(AcademySchema).optional().default([]),
})

export type M1DataV6 = z.infer<typeof M1DataSchemaV6>

export const M1DataSchemaV7 = M1DataSchemaV6.extend({
  schema_version: z.literal(7),
  intelligenceCoverage: z.record(CoverageKeySchema, z.number().min(0).max(100)).optional().default({}),
  counterIntelStates: z.array(CounterIntelStateSchema).optional().default([]),
  spyMissions: z.array(SpyMissionSchema).optional().default([]),
})

export type M1DataV7 = z.infer<typeof M1DataSchemaV7>

export const ProvinceIdSchema = z.string().min(1)
export const RegionIdSchema = z.string().min(1)
export const CharIdSchema = z.string().min(1)

export const ProvinceSchema = z.object({
  id: ProvinceIdSchema,
  name: z.string().min(1),
  regionId: RegionIdSchema,
  realmId: RealmIdSchema,
  siteIds: z.array(SiteIdSchema).readonly(),
  historicalCapital: SiteIdSchema.optional(),
  historicalNotes: z.string(),
})

export const RegionSchema = z.object({
  id: RegionIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  provinceIds: z.array(ProvinceIdSchema).readonly(),
})

export const CharacterTemplateSchema = z.object({
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

export const M1DataSchemaV8 = M1DataSchemaV7.extend({
  schema_version: z.literal(8),
  provinces: z.array(ProvinceSchema).optional().default([]),
  regions: z.array(RegionSchema).optional().default([]),
  characterTemplates: z.array(CharacterTemplateSchema).optional().default([]),
  localization: z.record(z.string(), z.string()).optional().default({}),
})

export type M1DataV8 = z.infer<typeof M1DataSchemaV8>

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
  rulers: z.map(RealmIdSchema, RulerStateSchema),
  academies: z.map(AcademyIdSchema, AcademySchema),
  eventChainStates: z.map(z.string().min(1), EventChainStateSchema),
  disasterStates: z.map(RealmIdSchema, DisasterStateSchema),
  tradeRoutes: z.map(TradeRouteIdSchema, TradeRouteSchema),
  factionInfluences: z.map(RealmIdSchema, FactionInfluenceStateSchema),
  passes: z.instanceof(Map),
  adjacencyEdges: z.instanceof(Map),
  sieges: z.instanceof(Map),
  edicts: z.instanceof(Map),
  governorAssignments: z.instanceof(Map),
  reformStates: z.instanceof(Map),
  intelligenceCoverage: z.instanceof(Map),
  spyMissions: z.instanceof(Map),
  counterIntelStates: z.instanceof(Map),
  provinces: z.instanceof(Map),
  regions: z.instanceof(Map),
  characterTemplates: z.instanceof(Map),
  localization: z.instanceof(Map),
  playerRealmId: z.string(),
  rngState: z.object({ seed: z.number(), counter: z.number() }),
  phases: z.array(z.function()),
  pendingOrders: z.array(z.any()),
})

export type M0DataSchemaType = z.infer<typeof M0DataSchema>
