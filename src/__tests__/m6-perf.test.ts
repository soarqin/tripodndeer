import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { runTickPhases } from '~/engine/clock'
import { PHASE_NAMES } from '~/engine/phases'

describe('M6 performance budget', () => {
  it('100 ticks complete under 200ms p95 (with M6 phases enabled)', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    const times: number[] = []

    let currentWorld = world
    for (let i = 0; i < 100; i++) {
      const start = performance.now()
      const result = runTickPhases(currentWorld, currentWorld.rngState)
      times.push(performance.now() - start)
      currentWorld = result.world
    }

    times.sort((a, b) => a - b)
    const p50 = times[Math.floor(times.length * 0.5)]!
    const p95 = times[Math.floor(times.length * 0.95)]!
    const p99 = times[Math.floor(times.length * 0.99)]!

    const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
    fs.writeFileSync(
      path.join(evidenceDir, 'm6-culture-perf.json'),
      JSON.stringify(
        { scenario: 'm6-with-phases', p50, p95, p99, timestamp: new Date().toISOString() },
        null,
        2,
      ),
      'utf-8',
    )

    expect(p95, `p95 tick time ${p95.toFixed(2)}ms should be < 200ms`).toBeLessThan(200)
  }, { timeout: 60000 })

  it('M6 phases (culturalIdentity + ideologyDrift + prestigeUpdate) < 25ms per tick', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    const m6Phases = [
      PHASE_NAMES.CULTURAL_IDENTITY,
      PHASE_NAMES.IDEOLOGY_DRIFT,
      PHASE_NAMES.PRESTIGE_UPDATE,
    ] as const
    const m6PhaseTimes: number[] = []

    let currentWorld = world
    for (let i = 0; i < 100; i++) {
      let tickWorld = currentWorld
      let tickRng = currentWorld.rngState

      const start = performance.now()
      for (const phase of currentWorld.phases) {
        const phaseName = phase.name || ''
        if (m6Phases.includes(phaseName as typeof m6Phases[number])) {
          const phaseResult = phase(tickWorld, tickRng)
          tickWorld = phaseResult.world
          tickRng = phaseResult.nextRng
        }
      }
      m6PhaseTimes.push(performance.now() - start)

      const result = runTickPhases(currentWorld, currentWorld.rngState)
      currentWorld = result.world
    }

    m6PhaseTimes.sort((a, b) => a - b)
    const p95M6 = m6PhaseTimes[Math.floor(m6PhaseTimes.length * 0.95)]!
    const totalM6Time = m6PhaseTimes.reduce((a, b) => a + b, 0)
    const avgM6Time = totalM6Time / m6PhaseTimes.length

    const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
    fs.writeFileSync(
      path.join(evidenceDir, 'm6-culture-phase-perf.json'),
      JSON.stringify(
        {
          scenario: 'm6-phases-only',
          p95M6,
          avgM6Time,
          totalM6Time,
          samples: m6PhaseTimes.slice(0, 10),
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    )

    expect(
      p95M6,
      `M6 phases p95 per-tick ${p95M6.toFixed(2)}ms should be < 25ms`,
    ).toBeLessThan(25)
  }, { timeout: 60000 })
})
