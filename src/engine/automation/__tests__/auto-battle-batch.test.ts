import { describe, expect, it } from 'vitest'
import type {
  BatchConfig,
  BatchMeta,
  BatchOutcomes,
  BatchReport,
  BatchRuntime,
  BehaviorMetricsAggregate,
  RealmDistribution,
} from '../auto-battle-batch'

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
