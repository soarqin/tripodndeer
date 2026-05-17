import type { DifficultyTier, RealmId } from '~/shared/types'

import { runAutoBattleWithFinalWorldAsync, type AutoBattleConfig } from './auto-battle'
import { computeBehaviorMetrics, type BehaviorMetrics } from './behavior-metrics'
import { SCENARIO_START_DATES } from './date-utils'
import { getWinnerWithLargestActiveFallback } from './winner-fallback'

const M9_REALM_IDS: readonly RealmId[] = [
  'realm_qin',
  'realm_chu',
  'realm_qi',
  'realm_yan',
  'realm_han',
  'realm_zhao',
  'realm_wei',
  'realm_zhou',
  'realm_yue',
  'realm_song',
  'realm_lu',
  'realm_zhongshan',
]

const M9_EXPECTED_RATES: Partial<Record<RealmId, number>> = {
  realm_qin: 0.4,
  realm_chu: 0.18,
  realm_qi: 0.15,
  realm_zhao: 0.1,
  realm_wei: 0.08,
  realm_han: 0.04,
  realm_yan: 0.03,
  realm_zhou: 0.02,
}

const EXPECTED_RATE_TOLERANCE = 0.05

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
  readonly endTick: number
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

export async function runAutoBattleBatch(config: BatchConfig): Promise<BatchReport> {
  const startMs = Date.now()
  const traces: InternalGameTrace[] = []
  let rollingMeanMs = 0
  const alpha = 0.3

  for (let i = 0; i < config.limit; i++) {
    const seed = config.seedStart + i
    const gameStart = Date.now()

    const battleConfig: AutoBattleConfig = {
      scenarioId: config.scenarioId,
      difficulty: config.difficulty,
      seed,
      maxTicks: config.maxTicks,
      stopCondition: 'unification',
    }

    const { result, finalWorld } = await runAutoBattleWithFinalWorldAsync(battleConfig)

    const perGameMs = Date.now() - gameStart
    rollingMeanMs = i === 0 ? perGameMs : alpha * perGameMs + (1 - alpha) * rollingMeanMs

    const winnerRealmId = result.winnerRealmId ?? getWinnerWithLargestActiveFallback(finalWorld)
    const unified = result.winnerRealmId !== null

    const scenarioStart = SCENARIO_START_DATES[config.scenarioId]
    const behaviorMetrics = computeBehaviorMetrics(finalWorld, scenarioStart)

    const activeRealmIds = new Set<RealmId>()
    for (const realm of finalWorld.realms.values()) {
      if ((realm.status ?? 'active') === 'active') {
        activeRealmIds.add(realm.id)
      }
    }

    traces.push({
      seed,
      winnerRealmId,
      endTick: finalWorld.tick,
      unified,
      perGameMs,
      behaviorMetrics,
      unattributedActions: behaviorMetrics.unattributedActions,
      activeRealmIds,
    })

    const etaMs = rollingMeanMs * (config.limit - i - 1)
    config.progressCallback?.({
      gamesCompleted: i + 1,
      totalGames: config.limit,
      etaMs,
      lastWinner: winnerRealmId,
      endTick: finalWorld.tick,
    })

    await new Promise<void>(resolve => setImmediate(resolve))
  }

  return buildBatchReport(config, traces, Date.now() - startMs)
}

function buildBatchReport(
  config: BatchConfig,
  traces: readonly InternalGameTrace[],
  runtimeMs: number,
): BatchReport {
  const samples = traces.length
  return {
    meta: {
      scenarioId: config.scenarioId,
      difficulty: config.difficulty,
      samples,
      seedRange: [config.seedStart, config.seedStart + config.limit - 1],
      maxTicks: config.maxTicks,
      stopCondition: config.stopCondition,
    },
    outcomes: buildBatchOutcomes(config, traces),
    distribution: buildDistribution(traces),
    behaviorMetrics: buildBehaviorMetricsAggregate(traces),
    runtime: buildRuntime(traces, runtimeMs),
  }
}

function buildBatchOutcomes(
  config: BatchConfig,
  traces: readonly InternalGameTrace[],
): BatchOutcomes {
  const samples = traces.length
  const unifications = traces.filter((trace) => trace.unified).length
  return {
    unificationRate: samples === 0 ? 0 : unifications / samples,
    nullWinnerCount: traces.filter((trace) => trace.winnerRealmId === null).length,
    maxTicksHitCount: traces.filter((trace) => trace.endTick >= config.maxTicks).length,
    unattributedActions: traces.reduce((sum, trace) => sum + trace.unattributedActions, 0),
  }
}

function buildDistribution(
  traces: readonly InternalGameTrace[],
): { readonly [realmId: string]: RealmDistribution } {
  const winCounts = new Map<RealmId, number>()
  for (const realmId of M9_REALM_IDS) winCounts.set(realmId, 0)

  for (const trace of traces) {
    if (trace.winnerRealmId === null) continue
    winCounts.set(trace.winnerRealmId, (winCounts.get(trace.winnerRealmId) ?? 0) + 1)
  }

  const lastTrace = traces[traces.length - 1]
  const distribution: Record<string, RealmDistribution> = {}
  for (const realmId of M9_REALM_IDS) {
    const winCount = winCounts.get(realmId) ?? 0
    const winRate = traces.length === 0 ? 0 : winCount / traces.length
    const expectedRate = M9_EXPECTED_RATES[realmId]
    distribution[realmId] = {
      winCount,
      winRate,
      active: lastTrace?.activeRealmIds.has(realmId) ?? false,
      expectedRate,
      tolerance: EXPECTED_RATE_TOLERANCE,
      inTolerance:
        expectedRate === undefined ? true : Math.abs(winRate - expectedRate) <= EXPECTED_RATE_TOLERANCE,
    }
  }
  return distribution
}

function buildBehaviorMetricsAggregate(
  traces: readonly InternalGameTrace[],
): BehaviorMetricsAggregate {
  const samples = traces.length
  const conquerorWars = traces.reduce(
    (sum, trace) => sum + trace.behaviorMetrics.conqueror.warsDeclared,
    0,
  )
  const stewardWarYears = traces.reduce(
    (sum, trace) => sum + trace.behaviorMetrics.steward.warYears,
    0,
  )
  const schemerAlliances = traces.reduce(
    (sum, trace) => sum + trace.behaviorMetrics.schemer.alliances,
    0,
  )

  return {
    conqueror: {
      avgWarsDeclaredPerGame: samples === 0 ? 0 : conquerorWars / samples,
      sampleSize: traces.filter((trace) => trace.behaviorMetrics.conqueror.sampleSize > 0).length,
    },
    steward: {
      avgWarYearsPerGame: samples === 0 ? 0 : stewardWarYears / samples,
      sampleSize: traces.filter((trace) => trace.behaviorMetrics.steward.sampleSize > 0).length,
    },
    schemer: {
      avgAlliancesPerGame: samples === 0 ? 0 : schemerAlliances / samples,
      sampleSize: traces.filter((trace) => trace.behaviorMetrics.schemer.sampleSize > 0).length,
    },
  }
}

function buildRuntime(
  traces: readonly InternalGameTrace[],
  runtimeMs: number,
): BatchRuntime {
  const perGameTimes = traces.map((trace) => trace.perGameMs)
  const totalPerGameMs = perGameTimes.reduce((sum, ms) => sum + ms, 0)
  return {
    runtimeMs,
    perGameMeanMs: perGameTimes.length === 0 ? 0 : totalPerGameMs / perGameTimes.length,
    perGameP95Ms: percentile95(perGameTimes),
  }
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * 0.95) - 1
  return sorted[index] ?? 0
}
