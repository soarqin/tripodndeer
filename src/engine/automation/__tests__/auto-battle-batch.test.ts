import { beforeAll, describe, expect, it, vi } from 'vitest'

import { runAutoBattle, runAutoBattleWithFinalWorld } from '../auto-battle'
import type {
  BatchConfig,
  BatchMeta,
  BatchOutcomes,
  BatchReport,
  BatchRuntime,
  BehaviorMetricsAggregate,
  RealmDistribution,
} from '../auto-battle-batch'
import { runAutoBattleBatch } from '../auto-battle-batch'

const M9_REALM_IDS = [
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
] as const

describe('BatchReport schema', () => {
  it('BatchReport has exactly 5 top-level keys in correct order', () => {
    const fixture: BatchReport = {
      meta: {
        scenarioId: 'm9',
        difficulty: 'hero',
        samples: 5,
        seedRange: [1, 5] as const,
        maxTicks: 7200,
        stopCondition: 'unification',
      },
      outcomes: {
        unificationRate: 0.8,
        nullWinnerCount: 1,
        maxTicksHitCount: 0,
        unattributedActions: 3,
      },
      distribution: {
        realm_qin: {
          winCount: 3,
          winRate: 0.6,
          active: true,
          expectedRate: 0.4,
          tolerance: 0.05,
          inTolerance: false,
        },
      },
      behaviorMetrics: {
        conqueror: { avgWarsDeclaredPerGame: 2.5, sampleSize: 3 },
        steward: { avgWarYearsPerGame: 1.2, sampleSize: 2 },
        schemer: { avgAlliancesPerGame: 1.8, sampleSize: 2 },
      },
      runtime: {
        runtimeMs: 5000,
        perGameMeanMs: 1000,
        perGameP95Ms: 1200,
      },
    }

    const keys = Object.keys(fixture)
    expect(keys).toEqual(['meta', 'outcomes', 'distribution', 'behaviorMetrics', 'runtime'])
  })

  it('outcomes has unattributedActions field', () => {
    const outcomes: BatchOutcomes = {
      unificationRate: 0.8,
      nullWinnerCount: 1,
      maxTicksHitCount: 0,
      unattributedActions: 5,
    }

    expect(outcomes.unattributedActions).toBe(5)
  })

  it('distribution has active field', () => {
    const dist: RealmDistribution = {
      winCount: 0,
      winRate: 0,
      active: false,
      tolerance: 0.05,
      inTolerance: true,
    }

    expect(dist.active).toBe(false)
  })
})

describe('Batch type surfaces', () => {
  it('keeps supporting types assignable', () => {
    const config: BatchConfig = {
      scenarioId: 'm9',
      difficulty: 'hero',
      seedStart: 1,
      limit: 2,
      maxTicks: 7200,
      stopCondition: 'unification',
    }

    const meta: BatchMeta = {
      scenarioId: 'm9',
      difficulty: 'hero',
      samples: 2,
      seedRange: [1, 2] as const,
      maxTicks: 7200,
      stopCondition: 'unification',
    }

    const runtime: BatchRuntime = {
      runtimeMs: 1,
      perGameMeanMs: 1,
      perGameP95Ms: 1,
    }

    const behaviorMetrics: BehaviorMetricsAggregate = {
      conqueror: { avgWarsDeclaredPerGame: 0, sampleSize: 0 },
      steward: { avgWarYearsPerGame: 0, sampleSize: 0 },
      schemer: { avgAlliancesPerGame: 0, sampleSize: 0 },
    }

    expect(config.limit).toBe(2)
    expect(meta.samples).toBe(2)
    expect(runtime.runtimeMs).toBe(1)
    expect(behaviorMetrics.conqueror.sampleSize).toBe(0)
  })
})

describe('runAutoBattleBatch', () => {
  let report: BatchReport

  beforeAll(async () => {
    report = await runAutoBattleBatch({
      scenarioId: 'm9',
      difficulty: 'hero',
      seedStart: 1,
      limit: 3,
      maxTicks: 10,
      stopCondition: 'unification',
    })
  }, 30000)

  it('runAutoBattleWithFinalWorld returns a finalWorld', () => {
    const { result, finalWorld } = runAutoBattleWithFinalWorld({
      scenarioId: 'm9',
      difficulty: 'hero',
      seed: 42,
      maxTicks: 10,
      stopCondition: 'unification',
    })

    expect(finalWorld.tick).toBeGreaterThanOrEqual(0)
    expect(result.endTick).toBe(finalWorld.tick)
  }, 60000)

  it('preserves the M8.2 runAutoBattle contract', () => {
    const result = runAutoBattle({
      scenarioId: 'm1',
      difficulty: 'hero',
      seed: 42,
      maxTicks: 3,
      stopCondition: 'tickLimit',
    })

    expect(result.endTick).toBe(3)
    expect(result.finalRealmStats.size).toBeGreaterThan(0)
  })

  it('returns a basic report for multiple games', () => {
    expect(report.meta.samples).toBe(3)
    expect(Object.keys(report.distribution).length).toBe(12)
    expect(report.runtime.runtimeMs).toBeGreaterThan(0)
  })

  it('calls progressCallback once per game', async () => {
    const progressCallback = vi.fn()

    await runAutoBattleBatch({
      scenarioId: 'm9',
      difficulty: 'hero',
      seedStart: 1,
      limit: 2,
      maxTicks: 10,
      stopCondition: 'unification',
      progressCallback,
    })

    expect(progressCallback).toHaveBeenCalledTimes(2)
    expect(progressCallback).toHaveBeenLastCalledWith(
      expect.objectContaining({ gamesCompleted: 2, totalGames: 2 }),
    )
  }, 15000)

  it('keeps unificationRate in [0, 1]', () => {
    expect(report.outcomes.unificationRate).toBeGreaterThanOrEqual(0)
    expect(report.outcomes.unificationRate).toBeLessThanOrEqual(1)
  })

  it('includes all 12 M9 realms in distribution', () => {
    expect(Object.keys(report.distribution).sort()).toEqual([...M9_REALM_IDS].sort())
  })

  it('aggregates behavior metrics for the tracked archetypes', () => {
    expect(Object.keys(report.behaviorMetrics).sort()).toEqual(['conqueror', 'schemer', 'steward'])
  })

  it('sets expected rates for playable realms', () => {
    expect(report.distribution.realm_qin?.expectedRate).toBe(0.4)
  })

  it('omits expected rates for AI-only realms', () => {
    expect(report.distribution.realm_lu?.expectedRate).toBeUndefined()
  })

  it('is deterministic for stable report fields', async () => {
    const r1 = await runAutoBattleBatch({
      scenarioId: 'm9',
      difficulty: 'hero',
      seedStart: 1,
      limit: 2,
      maxTicks: 10,
      stopCondition: 'unification',
    })
    const r2 = await runAutoBattleBatch({
      scenarioId: 'm9',
      difficulty: 'hero',
      seedStart: 1,
      limit: 2,
      maxTicks: 10,
      stopCondition: 'unification',
    })
    const stable1 = {
      meta: r1.meta,
      outcomes: r1.outcomes,
      distribution: r1.distribution,
      behaviorMetrics: r1.behaviorMetrics,
    }
    const stable2 = {
      meta: r2.meta,
      outcomes: r2.outcomes,
      distribution: r2.distribution,
      behaviorMetrics: r2.behaviorMetrics,
    }

    expect(JSON.stringify(stable1)).toEqual(JSON.stringify(stable2))
  }, 15000)
})

describe('T4.4 determinism guard', () => {
  it('same seed range produces byte-equal stable aggregate', async () => {
    const config = {
      scenarioId: 'm9' as const,
      difficulty: 'hero' as const,
      seedStart: 1,
      limit: 2,
      maxTicks: 10,
      stopCondition: 'unification' as const,
    }

    const r1 = await runAutoBattleBatch(config)
    const r2 = await runAutoBattleBatch(config)

    const stable1 = {
      meta: r1.meta,
      outcomes: r1.outcomes,
      distribution: r1.distribution,
      behaviorMetrics: r1.behaviorMetrics,
    }
    const stable2 = {
      meta: r2.meta,
      outcomes: r2.outcomes,
      distribution: r2.distribution,
      behaviorMetrics: r2.behaviorMetrics,
    }

    expect(JSON.stringify(stable1)).toEqual(JSON.stringify(stable2))
  }, 15000)
})
