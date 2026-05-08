import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, createWorldFromM9Data, loadM1Data, loadM9Data } from '~/engine/world/factory'

interface PerfScenario {
  readonly scenario: string
  readonly siteCount: number
  readonly ticks: number
  readonly runs: number
  readonly p50: number
  readonly p95: number
  readonly p99: number
}

interface PerfBaselineFile {
  readonly m1: PerfScenario
  readonly m9: PerfScenario
  readonly capturedAt: string
}

const TICKS = 100
const RUNS = 5
const TOLERANCE = 1.2

function percentile(sortedSamples: readonly number[], p: number): number {
  if (sortedSamples.length === 0) return 0
  const index = Math.min(sortedSamples.length - 1, Math.floor(sortedSamples.length * p))
  return sortedSamples[index] ?? 0
}

function benchmarkScenario(
  scenario: 'm1' | 'm9',
  seed: number,
  siteCount: number,
  m9Data?: Awaited<ReturnType<typeof loadM9Data>>,
): number[] {
  const world =
    scenario === 'm1'
      ? createWorldFromM1Data(loadM1Data(), seed, 'realm_qin')
      : createWorldFromM9Data(m9Data!, seed, 'realm_qin')

  const samples: number[] = []
  let currentWorld = world
  let currentRng = world.rngState

  for (let i = 0; i < TICKS; i += 1) {
    const start = performance.now()
    const result = runTickPhases(currentWorld, currentRng)
    samples.push(performance.now() - start)
    currentWorld = result.world
    currentRng = result.nextRng
  }

  samples.sort((left, right) => left - right)

  return samples
}

describe('M8.1 performance budget', () => {
  it('M8.1 perf within 20% of M8 baseline', async () => {
    const baseline = JSON.parse(
      readFileSync('.sisyphus/evidence/task-T1.1-perf-baseline.json', 'utf-8'),
    ) as PerfBaselineFile
    const m9Data = await loadM9Data()

    const m1Samples: number[] = []
    const m9Samples: number[] = []

    for (let run = 0; run < RUNS; run += 1) {
      m1Samples.push(...benchmarkScenario('m1', 42 + run, baseline.m1.siteCount))
      m9Samples.push(...benchmarkScenario('m9', 42 + run, baseline.m9.siteCount, m9Data))
    }

    m1Samples.sort((left, right) => left - right)
    m9Samples.sort((left, right) => left - right)

    const measurement = {
      m1: {
        scenario: 'm1-50sites',
        siteCount: baseline.m1.siteCount,
        ticks: TICKS,
        runs: RUNS,
        p50: percentile(m1Samples, 0.5),
        p95: percentile(m1Samples, 0.95),
        p99: percentile(m1Samples, 0.99),
      },
      m9: {
        scenario: 'm9-250sites',
        siteCount: baseline.m9.siteCount,
        ticks: TICKS,
        runs: RUNS,
        p50: percentile(m9Samples, 0.5),
        p95: percentile(m9Samples, 0.95),
        p99: percentile(m9Samples, 0.99),
      },
      capturedAt: new Date().toISOString(),
    }

    const evidenceDir = '.sisyphus/evidence'
    if (!existsSync(evidenceDir)) mkdirSync(evidenceDir, { recursive: true })
    writeFileSync(
      `${evidenceDir}/m8_1-perf.json`,
      JSON.stringify(measurement, null, 2),
      'utf-8',
    )

    expect(measurement.m1.p95).toBeLessThan(baseline.m1.p95 * TOLERANCE)
    expect(measurement.m9.p95).toBeLessThan(baseline.m9.p95 * TOLERANCE)
  }, { timeout: 600000 })
})
