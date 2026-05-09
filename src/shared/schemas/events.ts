import { z } from 'zod'
import type { PredicateNode } from '~/shared/types'
import {
  RealmIdSchema,
  SiteIdSchema,
  TerrainTypeSchema,
  IdeologySchema,
  CulturalTagSchema,
} from './core'
import {
  AcademyIdSchema,
  FactionIdSchema,
  SpecialtySchema,
  PersonalityArchetypeSchema,
} from './character'

export const PoliticalSystemSchema = z.enum(['enfeoffment', 'commandery', 'legalist_centralized'])

export const ZhouInvestitureRankSchema = z.enum(['duke', 'marquis', 'count', 'viscount', 'baron'])

export const BattleResolvedEventSchema = z.object({
  type: z.literal('battleResolved'),
  payload: z.object({
    battleResolution: z.unknown(),
    attackerRealmId: RealmIdSchema,
    defenderRealmId: RealmIdSchema,
    siteId: SiteIdSchema,
    armySizeTotal: z.number().int().nonnegative(),
    borderSite: z.boolean(),
  }),
})

export const SpyCaughtEventSchema = z.object({
  type: z.literal('spy_caught'),
  payload: z.object({
    observerRealmId: RealmIdSchema,
    subjectRealmId: RealmIdSchema,
    missionId: z.string().min(1),
  }),
})

export const EffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('realm.treasury'), realmId: RealmIdSchema, delta: z.number() }),
  z.object({ type: z.literal('character.create'), generalId: z.string().min(1), realmId: RealmIdSchema, name: z.string().min(1) }),
  z.object({ type: z.literal('character.kill'), generalId: z.string().min(1) }),
  z.object({ type: z.literal('character.loyalty'), generalId: z.string().min(1), delta: z.number() }),
  z.object({ type: z.literal('realm.trait.add'), realmId: RealmIdSchema, trait: z.string().min(1) }),
  z.object({ type: z.literal('realm.politicalSystem.set'), realmId: RealmIdSchema, system: PoliticalSystemSchema }),
  z.object({ type: z.literal('site.population.delta'), siteId: SiteIdSchema, delta: z.number().int() }),
  z.object({ type: z.literal('realm.faction.delta'), realmId: RealmIdSchema, faction: FactionIdSchema, delta: z.number() }),
  z.object({ type: z.literal('realm.warWeariness.delta'), realmId: RealmIdSchema, delta: z.number() }),
  z.object({ type: z.literal('realm.foodStores.delta'), realmId: RealmIdSchema, delta: z.number() }),
  z.object({ type: z.literal('realm.prestige.delta'), realmId: RealmIdSchema, delta: z.number() }),
  z.object({ type: z.literal('realm.ideology.delta'), realmId: RealmIdSchema, ideology: IdeologySchema, delta: z.number() }),
  z.object({ type: z.literal('realm.relation.delta'), realmId: RealmIdSchema, targetRealmId: RealmIdSchema, delta: z.number() }),
  z.object({ type: z.literal('site.culturalIdentity.delta'), siteId: SiteIdSchema, delta: z.number() }),
  z.object({ type: z.literal('site.cultural.set'), siteId: SiteIdSchema, tag: CulturalTagSchema }),
  z.object({ type: z.literal('academy.create'), academyId: AcademyIdSchema, hostRealmId: RealmIdSchema, hostSiteId: SiteIdSchema, primaryIdeology: IdeologySchema }),
  z.object({ type: z.literal('academy.dormant'), academyId: AcademyIdSchema }),
  z.object({ type: z.literal('zhouInvestiture.grant'), realmId: RealmIdSchema, rank: ZhouInvestitureRankSchema }),
  z.object({
    type: z.literal('realm.deactivate'),
    realmId: RealmIdSchema,
    reason: z.enum(['conquered', 'extinguished', 'merged']),
    absorbingRealmId: RealmIdSchema.optional(),
  }),
])

export type Effect = z.infer<typeof EffectSchema>

const I18nTextSchema = z.union([
  z.string().min(1),
  z.object({ key: z.string().min(1) }),
])

export const EventChainChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  text: I18nTextSchema.optional(),
  effects: z.array(EffectSchema),
  nextStageId: z.string().min(1).optional(),
})

export const EventChainStageSchema = z.object({
  id: z.string().min(1),
  text: I18nTextSchema,
  choices: z.array(EventChainChoiceSchema),
})

const AttitudeBucketSchema = z.enum(['hostile', 'cold', 'neutral', 'friendly', 'ally'])

export const PredicateNodeSchema: z.ZodType<PredicateNode> = z.lazy(() =>
  z.union([
    z.object({ kind: z.literal('realm.id'), value: RealmIdSchema }),
    z.object({ kind: z.literal('realm.has-character-with-specialty'), specialty: SpecialtySchema }),
    z.object({ kind: z.literal('realm.ruler-personality-in'), values: z.array(PersonalityArchetypeSchema) }),
    z.object({ kind: z.literal('realm.has-trait'), trait: z.string().min(1), not: z.boolean().optional() }),
    z.object({ kind: z.literal('realm.no-active-war') }),
    z.object({ kind: z.literal('realm.treasury-above'), value: z.number() }),
    z.object({ kind: z.literal('realm.population-above'), value: z.number() }),
    z.object({ kind: z.literal('realm.ruler-in-office-years'), minYears: z.number().int().nonnegative() }),
    z.object({ kind: z.literal('realm.has-political-system'), system: PoliticalSystemSchema }),
    z.object({ kind: z.literal('realm.year-after'), yearBC: z.number().int() }),
    z.object({ kind: z.literal('and'), children: z.array(PredicateNodeSchema) }),
    z.object({ kind: z.literal('or'), children: z.array(PredicateNodeSchema) }),
    z.object({ kind: z.literal('site.terrain'), siteId: SiteIdSchema, value: TerrainTypeSchema }),
    z.object({ kind: z.literal('site.population-above'), siteId: SiteIdSchema, value: z.number() }),
    z.object({ kind: z.literal('site.governor-zheng-above'), siteId: SiteIdSchema, value: z.number() }),
    z.object({ kind: z.literal('realm.faction-influence-above'), realmId: RealmIdSchema, faction: FactionIdSchema, value: z.number() }),
    z.object({ kind: z.literal('realm.prestige.gte'), threshold: z.number() }),
    z.object({ kind: z.literal('realm.prestige.lt'), threshold: z.number() }),
    z.object({ kind: z.literal('realm.relation.attitude'), targetRealmId: RealmIdSchema, minAttitude: AttitudeBucketSchema }),
    z.object({ kind: z.literal('realm.zhouInvestiture.has'), rank: ZhouInvestitureRankSchema.optional() }),
    z.object({ kind: z.literal('realm.zhouInvestiture.absent') }),
    z.object({ kind: z.literal('realm.id.equals'), value: RealmIdSchema }),
  ]),
)

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
    predicate: PredicateNodeSchema,
    realmId: RealmIdSchema.optional(),
  }),
])

export const EventChainScopeSchema = z.enum(['realm-scoped', 'fixed-realm', 'global'])

export const EventChainSchema = z.object({
  id: z.string().min(1),
  trigger: EventChainTriggerSchema,
  oneShot: z.boolean(),
  stages: z.array(EventChainStageSchema).min(1),
  between: z
    .object({
      earliest_year_bc: z.number().int().nullable().optional(),
      latest_year_bc: z.number().int().nullable().optional(),
    })
    .optional(),
  scope: EventChainScopeSchema.optional(),
})

export const EventChainStateSchema = z.object({
  id: z.string().min(1),
  currentStageId: z.string().min(1),
  completed: z.boolean(),
  startedAtTick: z.number().int().nonnegative(),
  choiceHistory: z.array(z.object({ stageId: z.string(), choiceId: z.string() })),
  realmId: RealmIdSchema.optional(),
})
