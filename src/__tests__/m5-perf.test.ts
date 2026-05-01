import { describe, expect, it } from 'vitest'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'
import { runTickPhases } from '~/engine/clock'
import type { World } from '~/shared/types'
import * as fs from 'fs'
import * as path from 'path'
import { PHASE_NAMES } from '~/engine/phases'

describe('M5 performance budget', () => {
  it('100 ticks complete under 200ms p95 (with M5 phases)', () => {
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
      path.join(evidenceDir, 'm5-character-perf.json'),
      JSON.stringify({ scenario: 'm5-with-phases', p50, p95, p99, timestamp: new Date().toISOString() }, null, 2),
      'utf-8',
    )

    expect(p95, `p95 tick time ${p95.toFixed(2)}ms should be < 200ms`).toBeLessThan(200)
  }, { timeout: 60000 })

  it('M5 phases (rulerLifecycle + characterLifecycle + recruitment) < 50ms per 100 ticks', () => {
    const data = loadM1Data()
    const world = createWorldFromM1Data(data, 42, 'realm_qin')
    const m5PhaseTimes: number[] = []
    const m5Phases = [
      PHASE_NAMES.RULER_LIFECYCLE,
      PHASE_NAMES.CHARACTER_LIFECYCLE,
      PHASE_NAMES.RECRUITMENT,
    ] as const

    let currentWorld = world
    for (let i = 0; i < 100; i++) {
      const start = performance.now()
      let tickWorld = currentWorld
      let tickRng = currentWorld.rngState

      for (const phase of currentWorld.phases) {
        const phaseName = phase.name || ''
        if (m5Phases.includes(phaseName as typeof m5Phases[number])) {
          const result = phase(tickWorld, tickRng)
          tickWorld = result.world
          tickRng = result.nextRng
        }
      }

      m5PhaseTimes.push(performance.now() - start)

      const result = runTickPhases(currentWorld, currentWorld.rngState)
      currentWorld = result.world
    }

    const totalM5Time = m5PhaseTimes.reduce((a, b) => a + b, 0)
    const avgM5Time = totalM5Time / 100

    const evidenceDir = path.resolve(process.cwd(), '.sisyphus/evidence')
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true })
    fs.writeFileSync(
      path.join(evidenceDir, 'm5-character-perf.json'),
      JSON.stringify({
        scenario: 'm5-phases-only',
        totalM5Time,
        avgM5Time,
        m5PhaseTimes: m5PhaseTimes.slice(0, 10),
        timestamp: new Date().toISOString(),
      }, null, 2),
      'utf-8',
    )

    expect(totalM5Time, `M5 phases total time ${totalM5Time.toFixed(2)}ms over 100 ticks should be < 50ms`).toBeLessThan(50)
  }, { timeout: 60000 })
})
