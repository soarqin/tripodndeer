import type { TerrainType } from '~/content/m2/balance'
import type { RealmId, SiteId } from './core'
import type { GeneralId, Specialty, PersonalityArchetype, FactionId } from './character'
import type { Ideology, AcademyId, CulturalTag } from './world'
import type { AttitudeBucket, CasusBelliId } from './diplomacy'

export type EventChainId = string

export type PoliticalSystem = 'enfeoffment' | 'commandery' | 'legalist_centralized'

export type ZhouInvestitureRank = 'duke' | 'marquis' | 'count' | 'viscount' | 'baron'

export type Effect =
  | { readonly type: 'realm.treasury'; readonly realmId: RealmId; readonly delta: number }
  | { readonly type: 'character.create'; readonly generalId: GeneralId; readonly realmId: RealmId; readonly name: string }
  | { readonly type: 'character.kill'; readonly generalId: GeneralId }
  | { readonly type: 'character.loyalty'; readonly generalId: GeneralId; readonly delta: number }
  | { readonly type: 'realm.trait.add'; readonly realmId: RealmId; readonly trait: string }
  | { readonly type: 'realm.politicalSystem.set'; readonly realmId: RealmId; readonly system: PoliticalSystem }
  | { readonly type: 'site.population.delta'; readonly siteId: SiteId; readonly delta: number }
  | { readonly type: 'realm.faction.delta'; readonly realmId: RealmId; readonly faction: FactionId; readonly delta: number }
  | { readonly type: 'realm.warWeariness.delta'; readonly realmId: RealmId; readonly delta: number }
  | { readonly type: 'realm.foodStores.delta'; readonly realmId: RealmId; readonly delta: number }
  | { readonly type: 'realm.prestige.delta'; readonly realmId: RealmId; readonly delta: number }
  | { readonly type: 'realm.ideology.delta'; readonly realmId: RealmId; readonly ideology: Ideology; readonly delta: number }
  | { readonly type: 'realm.relation.delta'; readonly realmId: RealmId; readonly targetRealmId: RealmId; readonly delta: number }
  | { readonly type: 'site.culturalIdentity.delta'; readonly siteId: SiteId; readonly delta: number }
  | { readonly type: 'site.cultural.set'; readonly siteId: SiteId; readonly tag: CulturalTag }
  | { readonly type: 'academy.create'; readonly academyId: AcademyId; readonly hostRealmId: RealmId; readonly hostSiteId: SiteId; readonly primaryIdeology: Ideology }
  | { readonly type: 'academy.dormant'; readonly academyId: AcademyId }
  | { readonly type: 'zhouInvestiture.grant'; readonly realmId: RealmId; readonly rank: ZhouInvestitureRank }
  | { readonly type: 'realm.deactivate'; readonly realmId: RealmId; readonly reason: 'conquered' | 'extinguished' | 'merged'; readonly absorbingRealmId?: RealmId }
  | { readonly type: 'realm.rulingHouseTransition'; readonly realmId: RealmId; readonly newHouse: string }

export interface EventChainChoice {
  readonly id: string
  readonly label?: string
  readonly text?: string | { readonly key: string }
  readonly effects: readonly Effect[]
  readonly nextStageId?: string
}

export interface EventChainStage {
  readonly id: string
  readonly text: string | { readonly key: string }
  readonly choices: readonly EventChainChoice[]
}

export type EventChainTrigger =
  | {
      readonly type: 'date'
      readonly between?: readonly [{ readonly yearBC: number }, { readonly yearBC: number }]
      readonly realmId?: RealmId
    }
  | {
      readonly type: 'state'
      readonly predicate?: PredicateNode
      readonly realmId?: RealmId
    }
  | {
      readonly type: 'year_range'
      readonly realmId?: RealmId
    }

export type EventChainScope = 'realm-scoped' | 'fixed-realm' | 'global'

export interface EventChain {
  readonly id: EventChainId
  readonly trigger: EventChainTrigger
  readonly oneShot: boolean
  readonly stages: readonly EventChainStage[]
  readonly between?: {
    readonly earliest_year_bc?: number | null
    readonly latest_year_bc?: number | null
  }
  readonly scope?: EventChainScope
  readonly author?: string
  readonly reviewedBy?: string
}

export interface EventChainState {
  readonly id: EventChainId
  readonly currentStageId: string
  readonly completed: boolean
  readonly startedAtTick: number
  readonly choiceHistory: ReadonlyArray<{ readonly stageId: string; readonly choiceId: string }>
  readonly realmId?: RealmId
}

export type PredicateNode =
  | { kind: 'realm.id'; value: RealmId }
  | { kind: 'realm.has-character-with-specialty'; specialty: Specialty }
  | { kind: 'realm.ruler-personality-in'; values: readonly PersonalityArchetype[] }
  | { kind: 'realm.has-trait'; trait: string; not?: boolean }
  | { kind: 'realm.no-active-war' }
  | { kind: 'realm.treasury-above'; value: number }
  | { kind: 'realm.population-above'; value: number }
  | { kind: 'realm.ruler-in-office-years'; minYears: number }
  | { kind: 'realm.has-political-system'; system: PoliticalSystem }
  | { kind: 'realm.year-after'; yearBC: number }
  | { kind: 'and'; children: readonly PredicateNode[] }
  | { kind: 'or'; children: readonly PredicateNode[] }
  | { kind: 'site.terrain'; siteId: SiteId; value: TerrainType }
  | { kind: 'site.population-above'; siteId: SiteId; value: number }
  | { kind: 'site.governor-zheng-above'; siteId: SiteId; value: number }
  | { kind: 'realm.faction-influence-above'; realmId: RealmId; faction: FactionId; value: number }
  | { kind: 'realm.prestige.gte'; threshold: number }
  | { kind: 'realm.prestige.lt'; threshold: number }
  | { kind: 'realm.relation.attitude'; targetRealmId: RealmId; minAttitude: AttitudeBucket }
  | { kind: 'realm.zhouInvestiture.has'; rank?: ZhouInvestitureRank }
  | { kind: 'realm.zhouInvestiture.absent' }
  | { kind: 'realm.id.equals'; value: RealmId }

// 游戏事件（M0 中 events 数组永远空，但 hook 必须在）
export interface GameEvent {
  type: string
  payload: unknown
}

export interface PlayerDefeatedEvent {
  readonly type: 'playerDefeated'
  readonly payload: {
    readonly realmId: RealmId
  }
}

export interface BattleResolvedEvent {
  readonly type: 'battleResolved'
  readonly payload: {
    readonly battleResolution: unknown
    readonly attackerRealmId: RealmId
    readonly defenderRealmId: RealmId
    readonly siteId: SiteId
    readonly armySizeTotal: number
    readonly borderSite: boolean
  }
}

export interface SpyCaughtEvent {
  readonly type: 'spy_caught'
  readonly payload: {
    readonly observerRealmId: RealmId
    readonly subjectRealmId: RealmId
    readonly missionId: string
  }
}

export interface EconomySettlementEvent {
  readonly type: 'economySettlement'
  readonly payload: {
    readonly realmId: RealmId
    readonly treasuryDelta: number
    readonly foodStoresDelta: number
    readonly populationDelta: number
    readonly householdsDelta: number
    readonly settledAtTick: number
  }
}

export type RulerDeathCause = 'natural'

export interface RulerDiedEvent {
  readonly type: 'rulerDied'
  readonly payload: {
    readonly realmId: RealmId
    readonly generalId: GeneralId
    readonly cause: RulerDeathCause
  }
}

export interface SuccessionResolvedEvent {
  readonly type: 'successionResolved'
  readonly payload: {
    readonly realmId: RealmId
    readonly newGeneralId: GeneralId
  }
}

export interface SuccessionCrisisEvent {
  readonly type: 'successionCrisis'
  readonly payload: {
    readonly realmId: RealmId
  }
}

export type CharacterDeathCause = 'natural'

export interface CharacterDiedEvent {
  readonly type: 'characterDied'
  readonly payload: {
    readonly generalId: GeneralId
    readonly generalName: string
    readonly realmId: RealmId
    readonly cause: CharacterDeathCause
  }
}

export interface CharacterDefectedEvent {
  readonly type: 'characterDefected'
  readonly payload: {
    readonly generalId: GeneralId
    readonly generalName: string
    readonly realmId: RealmId
  }
}

export interface CharacterRecruitedEvent {
  readonly type: 'characterRecruited'
  readonly payload: {
    readonly generalId: GeneralId
    readonly realmId: RealmId
    readonly name: string
  }
}

export interface RealmSplitEvent {
  readonly type: 'realmSplit'
  readonly payload: {
    readonly oldRealmId: RealmId
    readonly newRealmIds: readonly RealmId[]
  }
}

export interface GovernorAssignmentRevokedEvent {
  readonly type: 'governorAssignmentRevoked'
  readonly payload: {
    readonly siteId: SiteId
    readonly generalId: GeneralId
  }
}

export interface WarDeclaredEvent {
  readonly type: 'warDeclared'
  readonly payload: {
    readonly byRealm: RealmId
    readonly againstRealm: RealmId
    readonly casusBelli?: CasusBelliId | null
  }
}

export interface ReformCompletedEvent {
  readonly type: 'reformCompleted'
  readonly payload: {
    readonly realmId: RealmId
    readonly reformId: string
    readonly success: boolean
  }
}

export interface InvestitureChangedEvent {
  readonly type: 'investitureChanged'
  readonly payload: {
    readonly newHolderId: RealmId
    readonly rank: ZhouInvestitureRank
  }
}
