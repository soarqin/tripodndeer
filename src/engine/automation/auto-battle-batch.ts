import type { DifficultyTier, RealmId } from '~/shared/types'

interface BehaviorMetrics {
  readonly conqueror: { readonly warsDeclared: number; readonly sampleSize: number }
  readonly steward: { readonly warYears: number; readonly sampleSize: number }
  readonly schemer: { readonly alliances: number; readonly sampleSize: number }
  readonly unattributedActions: number
}

export interface BatchConfig {
  readonly scenarioId: 'm9'
  readonly difficulty: DifficultyTier
  readonly seedStart: number
  readonly limit: number
  readonly maxTicks: number
  readonly stopCondition: 'unification'
  readonly progressCallback?: (state: BatchProgress) => void
}

export interface BatchProgress {
  readonly gamesCompleted: number
  readonly totalGames: number
  readonly etaMs: number
  readonly lastWinner: RealmId | null
}

export interface BatchReport {
  readonly meta: BatchMeta
  readonly outcomes: BatchOutcomes
  readonly distribution: { readonly [realmId: string]: RealmDistribution }
  readonly behaviorMetrics: BehaviorMetricsAggregate
  readonly runtime: BatchRuntime
}

export interface BatchMeta {
  readonly scenarioId: 'm9'
  readonly difficulty: DifficultyTier
  readonly samples: number
  readonly seedRange: readonly [number, number]
  readonly maxTicks: number
  readonly stopCondition: 'unification'
}

export interface BatchOutcomes {
  readonly unificationRate: number
  readonly nullWinnerCount: number
  readonly maxTicksHitCount: number
  readonly unattributedActions: number
}

export interface RealmDistribution {
  readonly winCount: number
  readonly winRate: number
  readonly active: boolean
  readonly expectedRate?: number
  readonly tolerance: number
  readonly inTolerance: boolean
}

export interface BehaviorMetricsAggregate {
  readonly conqueror: { readonly avgWarsDeclaredPerGame: number; readonly sampleSize: number }
  readonly steward: { readonly avgWarYearsPerGame: number; readonly sampleSize: number }
  readonly schemer: { readonly avgAlliancesPerGame: number; readonly sampleSize: number }
}

export interface BatchRuntime {
  readonly runtimeMs: number
  readonly perGameMeanMs: number
  readonly perGameP95Ms: number
}

/** Internal — NOT exported. Per-game trace used in batch loop. */
interface InternalGameTrace {
  readonly seed: number
  readonly winnerRealmId: RealmId | null
  readonly endTick: number
  readonly unified: boolean
  readonly perGameMs: number
  readonly behaviorMetrics: BehaviorMetrics
  readonly unattributedActions: number
  readonly activeRealmIds: ReadonlySet<RealmId>
}

/** Stub — full implementation in T2.1 */
export async function runAutoBattleBatch(config: BatchConfig): Promise<BatchReport> {
  void config
  void (null as unknown as InternalGameTrace | null)
  throw new Error('runAutoBattleBatch: not implemented yet (T2.1)')
}
