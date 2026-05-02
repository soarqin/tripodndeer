import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

import { runTickPhases } from '~/engine/clock'
import { createWorldFromM1Data, loadM1Data } from '~/engine/world/factory'

describe('M4.1 performance budget', () => {
  it('100 ticks complete under 200ms p95 (with reformPhase active)', () => {
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
      path.join(evidenceDir, 'm4_1-reform-perf.json'),
      JSON.stringify(
        {
          scenario: 'm4_1-with-reform-phase',
          p50,
          p95,
          p99,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    )

    expect(p95, `p95 tick time ${p95.toFixed(2)}ms should be < 200ms`).toBeLessThan(200)
  }, { timeout: 60000 })
})
